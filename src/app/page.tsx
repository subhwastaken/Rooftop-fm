"use client";

import { useCallback, useEffect, useState } from "react";
import { Backdrop, resolveTimeOfDay } from "@/components/Backdrop";
import { ChannelRoom, type TimePreference } from "@/components/ChannelRoom";
import { EntryScreen } from "@/components/EntryScreen";
import { getClientId, normalizeCode } from "@/lib/identity";
import type { Identity, RoomSnapshot, TimeOfDay } from "@/lib/types";
import { useSocket } from "@/lib/useSocket";

const JOINED_CHANNEL_KEY = "rooftop:joined_code";
const IDENTITY_STORAGE_KEY = "sideb:identity";

interface ActiveSession {
  room: RoomSnapshot;
  identity: Identity;
}

export default function HomePage() {
  const { socket, connected } = useSocket();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [initialCode, setInitialCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rainIntensity, setRainIntensity] = useState(0);

  const [timePreference, setTimePreference] = useState<TimePreference>("auto");
  const [clockTime, setClockTime] = useState<TimeOfDay | null>(null);

  const [autoReconnecting, setAutoReconnecting] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const savedCode = sessionStorage.getItem(JOINED_CHANNEL_KEY);
      const savedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);
      return Boolean(savedCode && savedIdentity);
    } catch {
      return false;
    }
  });

  // Follow the local clock automatically for the rooftop background
  useEffect(() => {
    const updateClock = () => setClockTime(resolveTimeOfDay(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Pre-fill channel code when arriving from an invite link (?code=... or ?room=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("code") || params.get("room");
    if (raw) {
      const cleaned = normalizeCode(raw);
      if (cleaned) setInitialCode(cleaned);
    }
  }, []);

  const handleEntered = useCallback((room: RoomSnapshot, identity: Identity) => {
    setNotice(null);
    setSession({ room, identity });
    try {
      sessionStorage.setItem(JOINED_CHANNEL_KEY, room.code);
    } catch {
      // storage optional
    }
    window.history.replaceState(null, "", `/?code=${encodeURIComponent(room.code)}`);
  }, []);

  const handleLeave = useCallback((message?: string) => {
    setSession(null);
    setPlaying(false);
    setRainIntensity(0);
    setInitialCode(null);
    setNotice(message ?? null);
    try {
      sessionStorage.removeItem(JOINED_CHANNEL_KEY);
    } catch {
      // storage optional
    }
    window.history.replaceState(null, "", "/");
  }, []);

  // Seamless auto-reconnect on page refresh if user was in a channel
  useEffect(() => {
    if (!socket || !connected || session) return;

    let savedCode: string | null = null;
    let savedIdentity: Identity | null = null;

    try {
      savedCode = sessionStorage.getItem(JOINED_CHANNEL_KEY);
      const rawIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (rawIdentity) savedIdentity = JSON.parse(rawIdentity) as Identity;
    } catch {
      // storage unavailable
    }

    if (!savedCode || !savedIdentity?.name?.trim()) {
      setAutoReconnecting(false);
      return;
    }

    const targetCode = normalizeCode(savedCode);
    socket.emit(
      "room:join",
      {
        code: targetCode,
        userName: savedIdentity.name,
        userEmoji: savedIdentity.emoji,
        userColor: savedIdentity.color,
        clientId: getClientId(),
        reconnect: true
      },
      (res: { ok: boolean; room?: RoomSnapshot; error?: string }) => {
        setAutoReconnecting(false);
        if (res.ok && res.room) {
          handleEntered(res.room, savedIdentity as Identity);
        } else {
          try {
            sessionStorage.removeItem(JOINED_CHANNEL_KEY);
          } catch {}
          if (res.error) setNotice(res.error);
        }
      }
    );
  }, [socket, connected, session, handleEntered]);

  // On the entry screen, always follow natural time of day; manual theme switching unlocks inside a channel.
  const effectiveTime: TimeOfDay | null =
    !session || timePreference === "auto" ? clockTime : timePreference;

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <Backdrop time={effectiveTime} playing={playing} rainIntensity={rainIntensity} />

      {autoReconnecting && !session ? (
        <div className="relative z-10 flex h-dvh w-full flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/10 shadow-inner backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon-96x96.png" alt="Rooftop.fm logo" className="h-full w-full object-cover animate-spin-slow" />
          </div>
          <p className="font-display text-sm font-semibold tracking-wide text-white/90">
            Reconnecting to your channel…
          </p>
        </div>
      ) : !session || !socket ? (
        <EntryScreen
          key={initialCode ?? "entry"}
          socket={socket}
          connected={connected}
          initialCode={initialCode}
          notice={notice}
          onEntered={handleEntered}
        />
      ) : (
        <ChannelRoom
          key={session.room.code}
          socket={socket}
          initialRoom={session.room}
          identity={session.identity}
          timePreference={timePreference}
          onTimePreferenceChange={setTimePreference}
          onPlayingChange={setPlaying}
          onRainChange={setRainIntensity}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
