"use client";

import { useCallback, useEffect, useState } from "react";
import { Backdrop, resolveTimeOfDay } from "@/components/Backdrop";
import { ChannelRoom, type TimePreference } from "@/components/ChannelRoom";
import { EntryScreen } from "@/components/EntryScreen";
import { normalizeCode } from "@/lib/identity";
import type { Identity, RoomSnapshot, TimeOfDay } from "@/lib/types";
import { useSocket } from "@/lib/useSocket";

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

  // On the entry screen, always follow natural time of day; manual theme switching unlocks inside a channel.
  const effectiveTime: TimeOfDay | null =
    !session || timePreference === "auto" ? clockTime : timePreference;

  const handleEntered = useCallback((room: RoomSnapshot, identity: Identity) => {
    setNotice(null);
    setSession({ room, identity });
    window.history.replaceState(null, "", `/?code=${encodeURIComponent(room.code)}`);
  }, []);

  const handleLeave = useCallback((message?: string) => {
    setSession(null);
    setPlaying(false);
    setRainIntensity(0);
    setInitialCode(null);
    setNotice(message ?? null);
    window.history.replaceState(null, "", "/");
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <Backdrop time={effectiveTime} playing={playing} rainIntensity={rainIntensity} />

      {!session || !socket ? (
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
