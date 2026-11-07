import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MAX_PARTICIPANTS = 8;
const EMPTY_ROOM_TTL_MS = 1000 * 60 * 120;
const CODE_WORDS = ["MOON", "RAIN", "COZY", "LAMP", "DUSK", "WAVE", "TAPE", "GLOW", "NEST", "HUSH", "DAWN", "MIST"];

/** @type {Map<string, any>} */
const rooms = new Map();

const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const cleanText = (value, max) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/^([A-Z]+)(\d+)$/, "$1-$2")
    .slice(0, 14);
}

function generateCode() {
  for (let i = 0; i < 300; i++) {
    const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    const digits = Math.floor(10 + Math.random() * 90);
    const code = `${word}-${digits}`;
    if (!rooms.has(code)) return code;
  }
  return `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createRoom(code, name) {
  return {
    code,
    name,
    participants: new Map(),
    queue: [],
    history: [],
    lastEndedTrackId: null,
    playback: {
      currentTrack: null,
      isPlaying: false,
      positionSec: 0,
      updatedAt: Date.now(),
      lastActionBy: null
    },
    messages: [],
    togetherSince: null,
    togetherAccumMs: 0,
    cleanupTimer: null
  };
}

function computePositionSec(playback) {
  if (!playback.currentTrack) return 0;
  if (!playback.isPlaying) return playback.positionSec;
  const elapsed = Math.max(0, (Date.now() - playback.updatedAt) / 1000);
  const pos = playback.positionSec + elapsed;
  const duration = playback.currentTrack.durationSec;
  return duration > 0 ? Math.min(pos, duration) : pos;
}

function systemMessage(text) {
  return {
    id: makeId("msg"),
    type: "system",
    senderName: "",
    senderEmoji: "",
    senderColor: "",
    text,
    createdAt: Date.now()
  };
}

function togetherInfo(room) {
  const live = room.togetherSince ? Date.now() - room.togetherSince : 0;
  return { ms: room.togetherAccumMs + live, active: Boolean(room.togetherSince) };
}

function updateTogether(room) {
  const paired = room.participants.size >= 2;
  if (paired && !room.togetherSince) {
    room.togetherSince = Date.now();
  } else if (!paired && room.togetherSince) {
    room.togetherAccumMs += Date.now() - room.togetherSince;
    room.togetherSince = null;
  }
}

function presence(room) {
  return { participants: Array.from(room.participants.values()), together: togetherInfo(room) };
}

function snapshot(room) {
  return {
    code: room.code,
    name: room.name,
    participants: Array.from(room.participants.values()),
    queue: room.queue,
    playback: { ...room.playback, positionSec: computePositionSec(room.playback), updatedAt: Date.now() },
    messages: room.messages,
    together: togetherInfo(room)
  };
}

function sanitizeUser(payload) {
  const name = cleanText(payload?.userName, 24);
  if (!name) return null;
  return {
    name,
    emoji: cleanText(payload?.userEmoji, 8) || "🙂",
    color: /^#[0-9a-fA-F]{6}$/.test(payload?.userColor || "") ? payload.userColor : "#ffb36b"
  };
}

function uniqueName(room, name, ignoreSocketId) {
  const taken = new Set(
    Array.from(room.participants.values())
      .filter((p) => p.socketId !== ignoreSocketId)
      .map((p) => p.name.toLowerCase())
  );
  if (!taken.has(name.toLowerCase())) return name;
  let i = 2;
  while (taken.has(`${name} ${i}`.toLowerCase())) i++;
  return `${name} ${i}`;
}

function sanitizeTrack(raw, actor) {
  if (!raw || typeof raw.youtubeId !== "string" || !/^[\w-]{11}$/.test(raw.youtubeId)) return null;
  return {
    id: makeId("trk"),
    youtubeId: raw.youtubeId,
    title: cleanText(raw.title, 140) || "Untitled",
    artist: cleanText(raw.artist, 100) || "Unknown artist",
    album: cleanText(raw.album, 100) || undefined,
    coverUrl:
      typeof raw.coverUrl === "string" && raw.coverUrl.startsWith("https://")
        ? raw.coverUrl.slice(0, 500)
        : `https://i.ytimg.com/vi/${raw.youtubeId}/hqdefault.jpg`,
    durationSec: Math.max(0, Number(raw.durationSec) || 0),
    addedBy: actor
  };
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: { origin: "*" }
  });

  const emitPresence = (room) => io.to(room.code).emit("room:presence", presence(room));

  const pushMessage = (room, msg) => {
    room.messages.push(msg);
    if (room.messages.length > 200) room.messages.splice(0, room.messages.length - 200);
    io.to(room.code).emit("chat:message", msg);
  };

  const setPlayback = (room, patch) => {
    room.playback = { ...room.playback, ...patch, updatedAt: Date.now() };
    io.to(room.code).emit("playback:sync", room.playback);
  };

  const startTrack = (room, track, lastActionBy) => {
    if (room.playback.currentTrack) {
      room.history.push(room.playback.currentTrack);
      if (room.history.length > 40) room.history.shift();
    }
    room.lastEndedTrackId = null;
    setPlayback(room, { currentTrack: track, isPlaying: true, positionSec: 0, lastActionBy });
  };

  io.on("connection", (socket) => {
    let activeCode = null;

    const currentRoom = () => (activeCode ? rooms.get(activeCode) ?? null : null);

    const guard =
      (fn) =>
      (...args) => {
        const room = currentRoom();
        const me = room?.participants.get(socket.id);
        if (room && me) fn(room, me, ...args);
      };

    function leaveCurrentRoom() {
      const room = currentRoom();
      activeCode = null;
      if (!room) return;

      const me = room.participants.get(socket.id);
      room.participants.delete(socket.id);
      socket.leave(room.code);

      if (me) {
        if (me.inCall) socket.to(room.code).emit("call:peer-left", { fromId: socket.id });
        socket.to(room.code).emit("call:cancelled", { fromId: socket.id });
        updateTogether(room);
        emitPresence(room);
        pushMessage(room, systemMessage(`${me.emoji} ${me.name} left`));
      }

      if (room.participants.size === 0) {
        room.cleanupTimer = setTimeout(() => {
          if (room.participants.size === 0) rooms.delete(room.code);
        }, EMPTY_ROOM_TTL_MS);
      }
    }

    function enterRoom(room, user, announce) {
      leaveCurrentRoom();
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }

      const me = {
        socketId: socket.id,
        name: uniqueName(room, user.name),
        emoji: user.emoji,
        color: user.color,
        joinedAt: Date.now(),
        inCall: false,
        muted: false
      };
      room.participants.set(socket.id, me);
      activeCode = room.code;
      socket.join(room.code);
      updateTogether(room);
      if (announce) pushMessage(room, systemMessage(`${me.emoji} ${me.name} joined`));
      emitPresence(room);
      return me;
    }

    socket.on("clock:ping", (clientSentAt, ack) => {
      if (typeof ack === "function") ack({ clientSentAt, serverTime: Date.now() });
    });

    socket.on("room:check", (rawCode, ack) => {
      if (typeof ack !== "function") return;
      const room = rooms.get(normalizeCode(rawCode));
      ack(room ? { exists: true, name: room.name, count: room.participants.size } : { exists: false });
    });

    socket.on("room:create", (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const user = sanitizeUser(payload);
      if (!user) return reply({ ok: false, error: "Please tell us your name first." });

      const code = generateCode();
      const roomName = cleanText(payload?.roomName, 40) || `${user.name}'s channel`;
      const room = createRoom(code, roomName);
      room.messages.push(systemMessage(`“${roomName}” is ready. Share the code ${code} with your person.`));
      rooms.set(code, room);

      enterRoom(room, user, false);
      reply({ ok: true, room: snapshot(room) });
    });

    socket.on("room:join", (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const user = sanitizeUser(payload);
      if (!user) return reply({ ok: false, error: "Please tell us your name first." });

      const room = rooms.get(normalizeCode(payload?.code));
      if (!room) return reply({ ok: false, error: "We couldn't find that channel. Check the code and try again." });
      if (room.participants.size >= MAX_PARTICIPANTS && !room.participants.has(socket.id)) {
        return reply({ ok: false, error: "This channel is full." });
      }

      enterRoom(room, user, true);
      reply({ ok: true, room: snapshot(room) });
    });

    socket.on("room:leave", () => leaveCurrentRoom());

    socket.on(
      "room:rename",
      guard((room, me, rawName) => {
        const name = cleanText(rawName, 40);
        if (!name || name === room.name) return;
        room.name = name;
        io.to(room.code).emit("room:meta", { name });
        pushMessage(room, systemMessage(`${me.name} renamed the channel to “${name}”`));
      })
    );

    socket.on(
      "user:rename",
      guard((room, me, payload) => {
        const oldName = me.name;
        const name = cleanText(payload?.name, 24);
        if (name) me.name = uniqueName(room, name, socket.id);
        if (payload?.emoji) me.emoji = cleanText(payload.emoji, 8) || me.emoji;
        emitPresence(room);
        if (me.name !== oldName) pushMessage(room, systemMessage(`${oldName} is now ${me.name}`));
      })
    );

    // ---- Shared playback -------------------------------------------------
    socket.on(
      "playback:toggle",
      guard((room, me, requested) => {
        if (!room.playback.currentTrack) return;
        const playing = typeof requested === "boolean" ? requested : !room.playback.isPlaying;
        setPlayback(room, {
          positionSec: computePositionSec(room.playback),
          isPlaying: playing,
          lastActionBy: `${me.name} ${playing ? "pressed play" : "paused"}`
        });
      })
    );

    socket.on(
      "playback:seek",
      guard((room, me, target) => {
        const track = room.playback.currentTrack;
        if (!track) return;
        let pos = Math.max(0, Number(target) || 0);
        if (track.durationSec > 0) pos = Math.min(pos, track.durationSec);
        setPlayback(room, { positionSec: pos, lastActionBy: `${me.name} skipped to ${Math.floor(pos / 60)}:${String(Math.floor(pos % 60)).padStart(2, "0")}` });
      })
    );

    socket.on(
      "playback:playNow",
      guard((room, me, raw) => {
        const track = sanitizeTrack(raw, me.name);
        if (!track) return;
        startTrack(room, track, `${me.name} played a new song`);
        pushMessage(room, systemMessage(`💿 ${me.name} played a new song`));
      })
    );

    socket.on(
      "playback:next",
      guard((room, me) => {
        const next = room.queue.shift();
        if (!next) {
          if (room.playback.currentTrack) {
            setPlayback(room, { isPlaying: false, positionSec: 0, lastActionBy: `${me.name} reached the end of the queue` });
          }
          return;
        }
        io.to(room.code).emit("queue:update", room.queue);
        startTrack(room, next, `${me.name} skipped ahead`);
      })
    );

    socket.on(
      "playback:prev",
      guard((room, me) => {
        if (!room.playback.currentTrack) return;
        if (computePositionSec(room.playback) > 5 || room.history.length === 0) {
          setPlayback(room, { positionSec: 0, lastActionBy: `${me.name} restarted the song` });
          return;
        }
        const previous = room.history.pop();
        room.queue.unshift(room.playback.currentTrack);
        io.to(room.code).emit("queue:update", room.queue);
        room.lastEndedTrackId = null;
        setPlayback(room, { currentTrack: previous, isPlaying: true, positionSec: 0, lastActionBy: `${me.name} went back` });
      })
    );

    socket.on(
      "playback:ended",
      guard((room, _me, endedTrackId) => {
        const track = room.playback.currentTrack;
        // Every listener reports the end; only the first report for a track advances the queue.
        if (!track || track.id !== endedTrackId || room.lastEndedTrackId === endedTrackId) return;
        room.lastEndedTrackId = endedTrackId;

        const next = room.queue.shift();
        if (next) {
          io.to(room.code).emit("queue:update", room.queue);
          startTrack(room, next, "Up next");
        } else {
          setPlayback(room, { isPlaying: false, positionSec: 0, lastActionBy: "That was the last song — add another" });
        }
      })
    );

    // ---- Shared queue ----------------------------------------------------
    socket.on(
      "queue:add",
      guard((room, me, raw) => {
        const track = sanitizeTrack(raw, me.name);
        if (!track) return;
        if (!room.playback.currentTrack) {
          startTrack(room, track, `${me.name} played a new song`);
        } else {
          room.queue.push(track);
          io.to(room.code).emit("queue:update", room.queue);
        }
        pushMessage(room, systemMessage(`➕ ${me.name} added a song to the queue`));
      })
    );

    socket.on(
      "queue:remove",
      guard((room, _me, trackId) => {
        room.queue = room.queue.filter((t) => t.id !== trackId);
        io.to(room.code).emit("queue:update", room.queue);
      })
    );

    socket.on(
      "queue:playFromQueue",
      guard((room, me, trackId) => {
        const idx = room.queue.findIndex((t) => t.id === trackId);
        if (idx === -1) return;
        const [picked] = room.queue.splice(idx, 1);
        io.to(room.code).emit("queue:update", room.queue);
        startTrack(room, picked, `${me.name} played a new song`);
      })
    );

    // ---- Chat & reactions ------------------------------------------------
    socket.on(
      "chat:send",
      guard((room, me, text) => {
        const clean = cleanText(text, 500);
        if (!clean) return;
        pushMessage(room, {
          id: makeId("msg"),
          type: "user",
          senderSocketId: socket.id,
          senderName: me.name,
          senderEmoji: me.emoji,
          senderColor: me.color,
          text: clean,
          createdAt: Date.now()
        });
      })
    );

    socket.on(
      "chat:typing",
      guard((room, me, isTyping) => {
        socket.to(room.code).emit("chat:typing", { socketId: socket.id, name: me.name, isTyping: Boolean(isTyping) });
      })
    );

    socket.on(
      "reaction:send",
      guard((room, me, emoji) => {
        io.to(room.code).emit("reaction:burst", {
          id: makeId("rx"),
          emoji: cleanText(emoji, 8) || "❤️",
          senderName: me.name,
          xPercent: 15 + Math.floor(Math.random() * 70)
        });
      })
    );

    // ---- Voice calls: request → accept → peer-to-peer audio ----------------
    const sameRoomTarget = (room, toId) => typeof toId === "string" && room.participants.has(toId) && toId !== socket.id;

    socket.on(
      "call:request",
      guard((room, me) => {
        socket.to(room.code).emit("call:incoming", { fromId: socket.id, fromName: me.name, fromEmoji: me.emoji });
      })
    );

    socket.on(
      "call:cancel",
      guard((room) => {
        socket.to(room.code).emit("call:cancelled", { fromId: socket.id });
      })
    );

    socket.on(
      "call:accept",
      guard((room, me, payload) => {
        if (!sameRoomTarget(room, payload?.toId)) return;
        io.to(payload.toId).emit("call:accepted", { fromId: socket.id, fromName: me.name });
      })
    );

    socket.on(
      "call:decline",
      guard((room, me, payload) => {
        if (!sameRoomTarget(room, payload?.toId)) return;
        io.to(payload.toId).emit("call:declined", { fromId: socket.id, fromName: me.name });
      })
    );

    socket.on(
      "call:signal",
      guard((room, _me, payload) => {
        if (!sameRoomTarget(room, payload?.toId) || !payload.signal) return;
        io.to(payload.toId).emit("call:signal", { fromId: socket.id, signal: payload.signal });
      })
    );

    socket.on(
      "call:state",
      guard((room, me, payload) => {
        me.inCall = Boolean(payload?.inCall);
        me.muted = Boolean(payload?.muted);
        emitPresence(room);
      })
    );

    socket.on(
      "call:hangup",
      guard((room, me) => {
        me.inCall = false;
        me.muted = false;
        socket.to(room.code).emit("call:peer-left", { fromId: socket.id });
        emitPresence(room);
      })
    );

    socket.on("disconnect", () => leaveCurrentRoom());
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Rooftop.fm ready on http://localhost:${port}`);
  });
});
