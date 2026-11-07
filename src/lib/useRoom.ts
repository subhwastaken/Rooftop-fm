"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { playSoftPing } from "./chime";
import type {
  ChatMessage,
  FloatingReaction,
  Identity,
  Participant,
  PlaybackState,
  PresencePayload,
  RoomSnapshot,
  TrackInput,
  TrackItem
} from "./types";

interface JoinAck {
  ok: boolean;
  room?: RoomSnapshot;
  error?: string;
}

interface UseRoomArgs {
  socket: Socket;
  initial: RoomSnapshot;
  identity: Identity;
  onEnded: (message: string) => void;
}

export interface TogetherClock {
  baseMs: number;
  active: boolean;
  at: number;
}

export function useRoom({ socket, initial, identity, onEnded }: UseRoomArgs) {
  const [name, setName] = useState(initial.name);
  const [participants, setParticipants] = useState<Participant[]>(initial.participants);
  const [queue, setQueue] = useState<TrackItem[]>(initial.queue);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [playback, setPlayback] = useState<PlaybackState>(initial.playback);
  const [together, setTogether] = useState<TogetherClock>(() => ({
    baseMs: initial.together.ms,
    active: initial.together.active,
    at: Date.now()
  }));
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [connected, setConnected] = useState(socket.connected);
  const [selfId, setSelfId] = useState(socket.id ?? "");

  const identityRef = useRef(identity);
  identityRef.current = identity;
  const participantCountRef = useRef(initial.participants.length);
  const code = initial.code;

  useEffect(() => {
    const syncClock = () => {
      socket.emit("clock:ping", Date.now(), (res: { clientSentAt: number; serverTime: number }) => {
        const rtt = Date.now() - res.clientSentAt;
        setClockOffsetMs(res.serverTime + rtt / 2 - Date.now());
      });
    };

    const applySnapshot = (room: RoomSnapshot) => {
      setName(room.name);
      setParticipants(room.participants);
      participantCountRef.current = room.participants.length;
      setQueue(room.queue);
      setPlayback(room.playback);
      setMessages(room.messages);
      setTogether({ baseMs: room.together.ms, active: room.together.active, at: Date.now() });
    };

    const onConnect = () => {
      setConnected(true);
      setSelfId(socket.id ?? "");
      syncClock();
      // After a network blip the server has forgotten us — slip back into the channel.
      const me = identityRef.current;
      socket.emit(
        "room:join",
        { code, userName: me.name, userEmoji: me.emoji, userColor: me.color },
        (res: JoinAck) => {
          if (res.ok && res.room) applySnapshot(res.room);
          else onEnded("That channel has ended. Start a new one or join with another code.");
        }
      );
    };

    const onDisconnect = () => setConnected(false);

    const onPresence = (payload: PresencePayload) => {
      if (payload.participants.length > participantCountRef.current) playSoftPing();
      participantCountRef.current = payload.participants.length;
      setParticipants(payload.participants);
      setTogether({ baseMs: payload.together.ms, active: payload.together.active, at: Date.now() });
    };

    const onMeta = ({ name: next }: { name: string }) => setName(next);
    const onPlayback = (next: PlaybackState) => setPlayback(next);
    const onQueue = (next: TrackItem[]) => setQueue(next);

    const onMessage = (msg: ChatMessage) =>
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev.slice(-199), msg]));

    const onTyping = ({ socketId, name: who, isTyping }: { socketId: string; name: string; isTyping: boolean }) =>
      setTyping((prev) => {
        const next = { ...prev };
        if (isTyping) next[socketId] = who;
        else delete next[socketId];
        return next;
      });

    const onReaction = (reaction: FloatingReaction) => {
      setReactions((prev) => [...prev, reaction]);
      window.setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== reaction.id)), 3200);
    };

    syncClock();
    const interval = window.setInterval(syncClock, 20000);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:presence", onPresence);
    socket.on("room:meta", onMeta);
    socket.on("playback:sync", onPlayback);
    socket.on("queue:update", onQueue);
    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("reaction:burst", onReaction);

    return () => {
      window.clearInterval(interval);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:presence", onPresence);
      socket.off("room:meta", onMeta);
      socket.off("playback:sync", onPlayback);
      socket.off("queue:update", onQueue);
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("reaction:burst", onReaction);
    };
  }, [socket, code, onEnded]);

  const typingNames = useMemo(
    () =>
      Object.entries(typing)
        .filter(([id]) => id !== selfId && participants.some((p) => p.socketId === id))
        .map(([, who]) => who),
    [typing, participants, selfId]
  );

  const actions = useMemo(
    () => ({
      togglePlay: () => socket.emit("playback:toggle"),
      prev: () => socket.emit("playback:prev"),
      next: () => socket.emit("playback:next"),
      seek: (sec: number) => socket.emit("playback:seek", sec),
      playNow: (track: TrackInput) => socket.emit("playback:playNow", track),
      addToQueue: (track: TrackInput) => socket.emit("queue:add", track),
      playFromQueue: (id: string) => socket.emit("queue:playFromQueue", id),
      removeFromQueue: (id: string) => socket.emit("queue:remove", id),
      sendChat: (text: string) => socket.emit("chat:send", text),
      setTyping: (isTyping: boolean) => socket.emit("chat:typing", isTyping),
      react: (emoji: string) => socket.emit("reaction:send", emoji),
      renameChannel: (next: string) => socket.emit("room:rename", next),
      trackEnded: (trackId: string) => socket.emit("playback:ended", trackId)
    }),
    [socket]
  );

  const stableTrackEnded = useCallback((trackId: string) => actions.trackEnded(trackId), [actions]);

  return {
    code,
    name,
    participants,
    queue,
    messages,
    playback,
    together,
    typingNames,
    reactions,
    clockOffsetMs,
    connected,
    selfId,
    actions,
    onTrackEnded: stableTrackEnded
  };
}

