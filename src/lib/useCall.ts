"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { startRingtone } from "./chime";
import type { CallIncoming } from "./types";

export type CallStatus = "idle" | "calling" | "connecting" | "active";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun.cloudflare.com:3478"
      ]
    }
  ],
  iceCandidatePoolSize: 2
};

const RING_TIMEOUT_MS = 40_000;

// Optional TURN relay (configured on the server via env vars); empty when not set up.
let extraIceServers: RTCIceServer[] = [];
let iceFetched = false;
function loadExtraIceServers() {
  if (iceFetched || typeof window === "undefined") return;
  iceFetched = true;
  fetch("/api/ice")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { iceServers?: RTCIceServer[] } | null) => {
      if (data?.iceServers?.length) extraIceServers = data.iceServers;
    })
    .catch(() => {
      iceFetched = false;
    });
}

interface PeerEntry {
  pc: RTCPeerConnection;
  pending: RTCIceCandidateInit[];
  audio: HTMLAudioElement;
}

interface SignalPayload {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

function micErrorMessage() {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Voice needs a secure (https) link or localhost to use the microphone.";
  }
  return "Microphone access was blocked — allow it in your browser and try again.";
}

/**
 * Tunes the SDP for ultra-low latency Opus voice calling:
 * - 10ms frame size (halves buffer delay compared to standard 20ms)
 * - DTX (discontinuous transmission) prevents jitter and buffer bloat during silence
 * - In-band FEC protects against packet dropouts
 */
function tuneSdpForVoice(sdp: string): string {
  return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, rest) => {
    if (rest.includes("minptime") || rest.includes("usedtx")) return match;
    return `a=fmtp:${pt} ${rest};minptime=10;useinbandfec=1;usedtx=1;maxaveragebitrate=32000`;
  });
}

/**
 * Request-based ultra-low-latency voice calling.
 * One person rings, the other receives an incoming call prompt. Once accepted,
 * audio flows peer-to-peer over an optimized WebRTC connection.
 */
export function useCall(socket: Socket) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [incoming, setIncoming] = useState<CallIncoming | null>(null);
  const [muted, setMuted] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;
  const incomingRef = useRef(incoming);
  incomingRef.current = incoming;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const localRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, PeerEntry>());
  const earlyCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const ringTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadExtraIceServers();
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;
    peersRef.current.delete(peerId);
    earlyCandidatesRef.current.delete(peerId);
    entry.pc.onconnectionstatechange = null;
    entry.pc.oniceconnectionstatechange = null;
    entry.pc.ontrack = null;
    entry.pc.onicecandidate = null;
    entry.pc.close();
    entry.audio.srcObject = null;
    entry.audio.remove();
  }, []);

  const teardown = useCallback(() => {
    if (ringTimerRef.current) {
      window.clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    for (const id of Array.from(peersRef.current.keys())) closePeer(id);
    earlyCandidatesRef.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
  }, [closePeer]);

  const resetCall = useCallback(
    (message?: string) => {
      teardown();
      setStatus("idle");
      setMuted(false);
      setConnectedAt(null);
      socket.emit("call:state", { inCall: false, muted: false });
      if (message) flash(message);
    },
    [teardown, socket, flash]
  );

  const getMic = useCallback(async () => {
    if (localRef.current) return localRef.current;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-mic-api");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      }
    });
    localRef.current = stream;
    return stream;
  }, []);

  const createPeer = useCallback(
    (peerId: string, initiator: boolean): PeerEntry => {
      closePeer(peerId);
      const pc = new RTCPeerConnection({
        ...RTC_CONFIG,
        iceServers: [...(RTC_CONFIG.iceServers ?? []), ...extraIceServers]
      });
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.volume = 1.0;
      audio.style.display = "none";
      document.body.appendChild(audio);

      // Drain any early ICE candidates that arrived before peer initialization
      const early = earlyCandidatesRef.current.get(peerId) ?? [];
      earlyCandidatesRef.current.delete(peerId);

      const entry: PeerEntry = { pc, pending: [...early], audio };
      peersRef.current.set(peerId, entry);

      const stream = localRef.current;
      stream?.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        // Elevate network priority for voice packets
        try {
          const params = sender.getParameters();
          if (params.encodings && params.encodings[0]) {
            params.encodings[0].priority = "high";
            params.encodings[0].networkPriority = "high";
            void sender.setParameters(params);
          }
        } catch {
          // Priority optimization optional per browser
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:signal", { toId: peerId, signal: { candidate: event.candidate.toJSON() } });
        }
      };

      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audio.play().catch(() => {});
      };

      const handleConnected = () => {
        setStatus("active");
        setConnectedAt((prev) => prev ?? Date.now());
        socket.emit("call:state", { inCall: true, muted: mutedRef.current });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          handleConnected();
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeer(peerId);
          if (peersRef.current.size === 0 && statusRef.current !== "idle") {
            resetCall("The call dropped. You can ring again.");
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          handleConnected();
        }
      };

      if (initiator) {
        pc.createOffer({ offerToReceiveAudio: true })
          .then((offer) => {
            const tunedSdp = offer.sdp ? tuneSdpForVoice(offer.sdp) : offer.sdp;
            return pc.setLocalDescription({ type: offer.type, sdp: tunedSdp });
          })
          .then(() => {
            const d = pc.localDescription;
            if (d) {
              socket.emit("call:signal", { toId: peerId, signal: { description: { type: d.type, sdp: d.sdp } } });
            }
          })
          .catch(() => resetCall("Couldn't connect the call."));
      }

      return entry;
    },
    [closePeer, resetCall, socket]
  );

  useEffect(() => {
    const onIncoming = (data: CallIncoming) => {
      // Both people pressed call at once: the lower socket id answers so only one side makes the offer.
      if (statusRef.current === "calling") {
        if ((socket.id ?? "") < data.fromId) socket.emit("call:accept", { toId: data.fromId });
        return;
      }
      setIncoming(data);
    };

    const onAccepted = ({ fromId }: { fromId: string }) => {
      if (!localRef.current) return;
      if (ringTimerRef.current) {
        window.clearTimeout(ringTimerRef.current);
        ringTimerRef.current = null;
      }
      createPeer(fromId, true);
      setStatus((s) => (s === "calling" || s === "idle" ? "connecting" : s));
    };

    const onDeclined = ({ fromName }: { fromName: string }) => {
      if (peersRef.current.size === 0 && statusRef.current === "calling") {
        resetCall(`${fromName} can't talk right now.`);
      }
    };

    const onCancelled = ({ fromId }: { fromId: string }) => {
      setIncoming((prev) => (prev?.fromId === fromId ? null : prev));
    };

    const onPeerLeft = ({ fromId }: { fromId: string }) => {
      setIncoming((prev) => (prev?.fromId === fromId ? null : prev));
      if (!peersRef.current.has(fromId)) return;
      closePeer(fromId);
      if (peersRef.current.size === 0 && statusRef.current !== "idle") resetCall("The call ended.");
    };

    const onSignal = async ({ fromId, signal }: { fromId: string; signal: SignalPayload }) => {
      if (!localRef.current) return;
      let entry = peersRef.current.get(fromId);

      // Offer received on the callee side
      if (!entry && signal.description?.type === "offer") {
        entry = createPeer(fromId, false);
        setStatus((s) => (s === "idle" || s === "calling" ? "connecting" : s));
      }

      // If ICE candidate arrived before peer creation, buffer it without dropping!
      if (!entry && signal.candidate) {
        const list = earlyCandidatesRef.current.get(fromId) ?? [];
        list.push(signal.candidate);
        earlyCandidatesRef.current.set(fromId, list);
        return;
      }

      if (!entry) return;
      const { pc } = entry;

      try {
        if (signal.description) {
          await pc.setRemoteDescription(signal.description);
          for (const candidate of entry.pending.splice(0)) {
            await pc.addIceCandidate(candidate).catch(() => {});
          }
          if (signal.description.type === "offer") {
            const answer = await pc.createAnswer();
            const tunedSdp = answer.sdp ? tuneSdpForVoice(answer.sdp) : answer.sdp;
            await pc.setLocalDescription({ type: answer.type, sdp: tunedSdp });
            const d = pc.localDescription;
            if (d) {
              socket.emit("call:signal", { toId: fromId, signal: { description: { type: d.type, sdp: d.sdp } } });
            }
          }
        } else if (signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(signal.candidate).catch(() => {});
          } else {
            entry.pending.push(signal.candidate);
          }
        }
      } catch {
        // Transient negotiation races handled gracefully
      }
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:declined", onDeclined);
    socket.on("call:cancelled", onCancelled);
    socket.on("call:peer-left", onPeerLeft);
    socket.on("call:signal", onSignal);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:declined", onDeclined);
      socket.off("call:cancelled", onCancelled);
      socket.off("call:peer-left", onPeerLeft);
      socket.off("call:signal", onSignal);
    };
  }, [socket, createPeer, closePeer, resetCall]);

  // Ring while an incoming request is on screen.
  useEffect(() => {
    if (!incoming) return;
    return startRingtone();
  }, [incoming]);

  // Leaving the channel hangs up locally (the server tells the other side).
  useEffect(() => () => teardown(), [teardown]);

  const startCall = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    try {
      await getMic();
    } catch {
      flash(micErrorMessage());
      return;
    }
    setStatus("calling");
    socket.emit("call:request");
    ringTimerRef.current = window.setTimeout(() => {
      if (statusRef.current === "calling") {
        socket.emit("call:cancel");
        resetCall("No answer yet — try again in a moment.");
      }
    }, RING_TIMEOUT_MS);
  }, [getMic, flash, socket, resetCall]);

  const cancelCall = useCallback(() => {
    socket.emit("call:cancel");
    resetCall();
  }, [socket, resetCall]);

  const acceptCall = useCallback(async () => {
    const request = incomingRef.current;
    if (!request) return;
    try {
      await getMic();
    } catch {
      flash(micErrorMessage());
      socket.emit("call:decline", { toId: request.fromId });
      setIncoming(null);
      return;
    }
    setIncoming(null);
    setStatus((s) => (s === "idle" ? "connecting" : s));
    socket.emit("call:accept", { toId: request.fromId });
  }, [getMic, flash, socket]);

  const declineCall = useCallback(() => {
    const request = incomingRef.current;
    if (!request) return;
    socket.emit("call:decline", { toId: request.fromId });
    setIncoming(null);
  }, [socket]);

  const hangup = useCallback(() => {
    socket.emit("call:hangup");
    resetCall();
  }, [socket, resetCall]);

  const toggleMute = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !mutedRef.current;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
    socket.emit("call:state", { inCall: statusRef.current === "active", muted: next });
  }, [socket]);

  return {
    status,
    incoming,
    muted,
    connectedAt,
    notice,
    startCall,
    cancelCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMute
  };
}
