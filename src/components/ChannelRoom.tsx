"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  Check,
  CloudRain,
  Copy,
  Disc3,
  Link2,
  ListMusic,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  Tv,
  X
} from "lucide-react";
import { ambientMixer } from "@/lib/ambientAudio";
import { copyText } from "@/lib/clipboard";
import type { Identity, RoomSnapshot, TimeOfDay } from "@/lib/types";
import { useCall } from "@/lib/useCall";
import { activeLyricIndex, useLyrics } from "@/lib/useLyrics";
import { useRoom } from "@/lib/useRoom";
import { CallButton, IncomingCall } from "./CallControls";
import { ChatPanel } from "./ChatPanel";
import { LibraryPanel } from "./LibraryPanel";
import { NowPlayingStage } from "./NowPlayingStage";
import { PopOutPlayer } from "./PopOutPlayer";
import { RainOverlay } from "./RainOverlay";
import { SyncedAudioEngine } from "./SyncedYouTubeEngine";

export type TimePreference = "auto" | TimeOfDay;
type MobileTab = "stage" | "music" | "chat";

interface ChannelRoomProps {
  socket: Socket;
  initialRoom: RoomSnapshot;
  identity: Identity;
  timePreference: TimePreference;
  onTimePreferenceChange: (pref: TimePreference) => void;
  onPlayingChange: (playing: boolean) => void;
  onRainChange: (intensity: number) => void;
  onLeave: (notice?: string) => void;
}

const TIME_OPTIONS: { id: TimePreference; label: string; icon: React.ReactNode }[] = [
  { id: "auto", label: "Auto", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "day", label: "Day", icon: <Sun className="h-3.5 w-3.5" /> },
  { id: "sunset", label: "Sunset", icon: <Sunset className="h-3.5 w-3.5" /> },
  { id: "night", label: "Night", icon: <Moon className="h-3.5 w-3.5" /> }
];

export function ChannelRoom({
  socket,
  initialRoom,
  identity,
  timePreference,
  onTimePreferenceChange,
  onPlayingChange,
  onRainChange,
  onLeave
}: ChannelRoomProps) {
  const handleEnded = useCallback(
    (message: string) => {
      onLeave(message);
    },
    [onLeave]
  );

  const room = useRoom({
    socket,
    initial: initialRoom,
    identity,
    onEnded: handleEnded
  });

  const call = useCall(socket);
  const lyrics = useLyrics(room.playback.currentTrack);

  const [currentSec, setCurrentSec] = useState(initialRoom.playback.positionSec);
  const [durationSec, setDurationSec] = useState(initialRoom.playback.currentTrack?.durationSec ?? 0);
  const [volume, setVolume] = useState(85);
  const [showVideo, setShowVideo] = useState(false);

  // Cozy ambience mixer state (Rain audio + visual screen rain + Vinyl crackle)
  const [ambienceOpen, setAmbienceOpen] = useState(false);
  const [rainLevel, setRainLevel] = useState(0);
  const [lastRainPreset, setLastRainPreset] = useState(0.5);
  const [vinylLevel, setVinylLevel] = useState(0);
  const ambienceRef = useRef<HTMLDivElement | null>(null);

  // Channel rename inline state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(room.name);

  // Copy feedback
  const [copiedKind, setCopiedKind] = useState<"code" | "link" | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  // Mobile single-screen switcher + unread counter
  const [mobileTab, setMobileTab] = useState<MobileTab>("stage");
  const [seenMsgCount, setSeenMsgCount] = useState(initialRoom.messages.length);

  // Keep parent backdrop informed about playback state
  useEffect(() => {
    onPlayingChange(room.playback.isPlaying);
    return () => onPlayingChange(false);
  }, [room.playback.isPlaying, onPlayingChange]);

  // Snap timeline display immediately when track or shared seek updates
  useEffect(() => {
    if (!room.playback.currentTrack) {
      setCurrentSec(0);
      setDurationSec(0);
      return;
    }
    setCurrentSec(room.playback.positionSec);
    setDurationSec(room.playback.currentTrack.durationSec);
  }, [room.playback.currentTrack, room.playback.positionSec, room.playback.updatedAt]);

  // Keep inline draft synced when someone else renames the channel
  useEffect(() => {
    if (!editingName) setNameDraft(room.name);
  }, [room.name, editingName]);

  // Track unread chat messages on smaller screens
  useEffect(() => {
    if (mobileTab === "chat") {
      setSeenMsgCount(room.messages.length);
    }
  }, [mobileTab, room.messages.length]);

  const unreadChat = mobileTab === "chat" ? 0 : Math.max(0, room.messages.length - seenMsgCount);

  // Silence ambient audio & screen rain when leaving the room
  useEffect(() => {
    return () => {
      ambientMixer.setRainVolume(0);
      ambientMixer.setVinylVolume(0);
      onRainChange(0);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close ambience popover on outside click
  useEffect(() => {
    if (!ambienceOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ambienceRef.current && !ambienceRef.current.contains(event.target as Node)) {
        setAmbienceOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [ambienceOpen]);

  // Spacebar toggles shared play/pause when not typing in a field or button
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || el?.isContentEditable) {
        return;
      }
      if (!room.playback.currentTrack) return;
      event.preventDefault();
      room.actions.togglePlay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [room.playback.currentTrack, room.actions]);

  const applyRain = useCallback(
    (level: number) => {
      setRainLevel(level);
      if (level > 0) setLastRainPreset(level);
      ambientMixer.setRainVolume(level);
      onRainChange(level);
    },
    [onRainChange]
  );

  const toggleRain = useCallback(() => {
    if (rainLevel > 0) {
      applyRain(0);
    } else {
      applyRain(lastRainPreset || 0.5);
    }
  }, [rainLevel, lastRainPreset, applyRain]);

  const handleProgress = useCallback((cur: number, dur: number) => {
    setCurrentSec(cur);
    if (dur > 0) setDurationSec(dur);
  }, []);

  const flashCopy = useCallback((kind: "code" | "link") => {
    setCopiedKind(kind);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedKind(null), 2000);
  }, []);

  const handleCopyCode = useCallback(async () => {
    const ok = await copyText(room.code);
    if (ok) flashCopy("code");
  }, [room.code, flashCopy]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/?code=${encodeURIComponent(room.code)}`;
    const ok = await copyText(url);
    if (ok) flashCopy("link");
  }, [room.code, flashCopy]);

  const commitRename = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== room.name) {
      room.actions.renameChannel(trimmed);
    } else {
      setNameDraft(room.name);
    }
  };

  const leaveChannel = () => {
    socket.emit("room:leave");
    onLeave();
  };

  const lyricIdx = activeLyricIndex(lyrics.synced, currentSec);
  const activeLyric = lyricIdx >= 0 ? (lyrics.synced[lyricIdx]?.text ?? null) : null;
  const isRaining = rainLevel > 0;

  return (
    <main className="relative z-10 flex h-dvh flex-col gap-3 overflow-hidden p-3 sm:p-4">
      {/* Gentle atmospheric screen drizzle when Rain ambience is active */}
      <RainOverlay intensity={rainLevel} />

      {/* Hidden / PiP synced YouTube audio engine */}
      <SyncedAudioEngine
        playback={room.playback}
        clockOffsetMs={room.clockOffsetMs}
        volume={volume}
        showVideo={showVideo}
        onProgress={handleProgress}
        onTrackEnded={room.onTrackEnded}
      />

      {/* Incoming voice call request modal */}
      <IncomingCall incoming={call.incoming} onAccept={call.acceptCall} onDecline={call.declineCall} />

      {/* Transient call / connection toast */}
      {(call.notice || !room.connected) && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 px-4">
          <div className="glass-strong rounded-full px-4 py-2 text-xs font-bold text-[var(--honey)] shadow-xl animate-rise-in">
            {!room.connected ? "Reconnecting to your channel…" : call.notice}
          </div>
        </div>
      )}

      {/* Floating emoji reactions */}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 h-72 overflow-hidden">
        {room.reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.xPercent}%` }}
            className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-1 animate-float-up"
          >
            <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-[var(--ink)] backdrop-blur-sm">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Top Cozy Glass Bar */}
      <header className="glass relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-3xl px-3 py-2 sm:rounded-full sm:px-4">
        {/* Brand + Channel Name + Invite Code */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon-96x96.png"
              alt="Rooftop.fm logo"
              className="h-full w-full object-cover animate-vinyl"
              style={{ animationPlayState: room.playback.isPlaying ? "running" : "paused" }}
            />
          </span>

          {editingName ? (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value.slice(0, 40))}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setNameDraft(room.name);
                  setEditingName(false);
                }
              }}
              autoFocus
              aria-label="Channel name"
              className="field h-9 w-36 rounded-full px-3 text-sm font-bold sm:w-52"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title="Rename channel"
              className="group flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-left transition hover:bg-white/10"
            >
              <span className="max-w-[105px] truncate font-display text-base font-semibold sm:max-w-[200px]">
                {room.name}
              </span>
              <Pencil className="h-3 w-3 shrink-0 text-[var(--ink-faint)] opacity-0 transition group-hover:opacity-100" />
            </button>
          )}

          {/* Shareable Code + Direct Invite Link */}
          <div className="well flex shrink-0 items-center rounded-full p-0.5">
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              title="Copy channel code"
              className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-bold tracking-[0.14em] text-[var(--honey)] transition hover:bg-white/10"
            >
              <span className="whitespace-nowrap font-display">{room.code}</span>
              {copiedKind === "code" ? (
                <Check className="h-3.5 w-3.5 text-[var(--sage)]" />
              ) : (
                <Copy className="h-3.5 w-3.5 opacity-75" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              title="Copy direct invite link"
              aria-label="Copy direct invite link"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-soft)] transition hover:bg-white/10 hover:text-[var(--ink)]"
            >
              {copiedKind === "link" ? (
                <Check className="h-3.5 w-3.5 text-[var(--sage)]" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {copiedKind && (
            <span className="hidden text-xs font-bold text-[var(--sage)] xl:inline">
              {copiedKind === "code" ? "Code copied!" : "Invite link copied!"}
            </span>
          )}
        </div>

        {/* Right Controls: Call, 1-Click Rain + Ambience Mixer, Video, Sky Theme, Leave */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <CallButton
            status={call.status}
            canCall={room.participants.length >= 2}
            connectedAt={call.connectedAt}
            muted={call.muted}
            onStart={() => void call.startCall()}
            onCancel={call.cancelCall}
            onHangup={call.hangup}
            onToggleMute={call.toggleMute}
          />

          {/* 1-Click Rain Ambience Toggle + Fine-Tune Mixer */}
          <div ref={ambienceRef} className="relative">
            <div
              className={`well flex h-10 items-center rounded-full p-0.5 transition ${
                isRaining ? "border-sky-200/40 bg-sky-300/15" : ""
              }`}
            >
              <button
                type="button"
                onClick={toggleRain}
                aria-pressed={isRaining}
                aria-label={isRaining ? "Turn off rain ambience" : "Turn on rain ambience"}
                title={isRaining ? "Turn off rain" : "Gentle rain sound & visual drizzle"}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  isRaining
                    ? "bg-white/20 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                    : "text-[var(--ink-soft)] hover:bg-white/10 hover:text-[var(--ink)]"
                }`}
              >
                <CloudRain className={`h-4 w-4 ${isRaining ? "text-sky-200" : ""}`} />
                <span className="hidden sm:inline">Rain</span>
              </button>

              <button
                type="button"
                onClick={() => setAmbienceOpen((o) => !o)}
                aria-label="Adjust rain, vinyl crackle, and sky"
                title="Adjust rain & vinyl crackle"
                className="flex h-9 w-8 items-center justify-center rounded-full text-[var(--ink-soft)] transition hover:bg-white/10 hover:text-[var(--ink)]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>

            {ambienceOpen && (
              <div className="glass-strong fixed inset-x-3 top-16 z-50 mx-auto max-w-sm rounded-3xl p-4 shadow-2xl animate-rise-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-72">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-semibold text-[var(--ink)]">Room atmosphere</p>
                    <p className="mb-3 text-[11px] text-[var(--ink-faint)]">
                      Soft sound & drizzle just on your screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmbienceOpen(false)}
                    aria-label="Close atmosphere settings"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--ink-soft)] transition hover:bg-white/10 hover:text-[var(--ink)] sm:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="mb-3 block">
                  <span className="mb-1.5 flex justify-between text-xs font-bold text-[var(--ink-soft)]">
                    <span>🌧️ Gentle rain</span>
                    <span>{Math.round(rainLevel * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    className="scrub"
                    min={0}
                    max={100}
                    value={Math.round(rainLevel * 100)}
                    style={{ "--p": `${Math.round(rainLevel * 100)}%` } as React.CSSProperties}
                    onChange={(e) => applyRain(Number(e.target.value) / 100)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex justify-between text-xs font-bold text-[var(--ink-soft)]">
                    <span>💿 Vinyl crackle</span>
                    <span>{Math.round(vinylLevel * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    className="scrub"
                    min={0}
                    max={100}
                    value={Math.round(vinylLevel * 100)}
                    style={{ "--p": `${Math.round(vinylLevel * 100)}%` } as React.CSSProperties}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      setVinylLevel(v);
                      ambientMixer.setVinylVolume(v);
                    }}
                  />
                </label>

                {/* Mobile sky theme switcher inside popover when header hides it */}
                <div className="mt-3.5 border-t border-white/10 pt-3 md:hidden">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                    Rooftop sky
                  </p>
                  <div className="well grid grid-cols-4 gap-1 rounded-full p-1">
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onTimePreferenceChange(opt.id)}
                        className={`flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-bold transition ${
                          timePreference === opt.id ? "bg-white/20 text-[var(--ink)]" : "text-[var(--ink-faint)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toggle floating video preview */}
          <PopOutPlayer
            track={room.playback.currentTrack}
            isPlaying={room.playback.isPlaying}
            currentSec={currentSec}
            durationSec={durationSec}
            onTogglePlay={room.actions.togglePlay}
            onPrev={room.actions.prev}
            onNext={room.actions.next}
            onSeek={room.actions.seek}
          />

          <button
            type="button"
            onClick={() => setShowVideo((v) => !v)}
            aria-label={showVideo ? "Hide video window" : "Show video window"}
            title={showVideo ? "Hide video" : "Show music video"}
            className={`btn-soft flex h-10 w-10 items-center justify-center rounded-full ${
              showVideo ? "border-[var(--amber)]/50 text-[var(--honey)]" : ""
            }`}
          >
            <Tv className="h-4 w-4" />
          </button>

          {/* Rooftop Sky Switcher — visible once inside a channel */}
          <div className="well hidden items-center gap-0.5 rounded-full p-1 md:flex" role="group" aria-label="Sky backdrop">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onTimePreferenceChange(opt.id)}
                title={`${opt.label} sky`}
                className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition ${
                  timePreference === opt.id
                    ? "bg-white/20 text-[var(--ink)] shadow"
                    : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
                }`}
              >
                {opt.icon}
                <span className="hidden xl:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={leaveChannel}
            aria-label="Leave channel"
            title="Leave channel"
            className="btn-soft flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[var(--ink-soft)] hover:text-[var(--rose)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Single-Page 3-Panel Room Stage (never scrolls the viewport) */}
      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-12 lg:gap-4">
        <section className={`${mobileTab === "music" ? "flex" : "hidden"} h-full min-h-0 lg:col-span-4 lg:flex`}>
          <LibraryPanel
            queue={room.queue}
            currentSec={currentSec}
            lyrics={lyrics}
            hasTrack={Boolean(room.playback.currentTrack)}
            onPlayNow={room.actions.playNow}
            onAddToQueue={room.actions.addToQueue}
            onPlayFromQueue={room.actions.playFromQueue}
            onRemoveFromQueue={room.actions.removeFromQueue}
            onSeek={room.actions.seek}
          />
        </section>

        <section className={`${mobileTab === "stage" ? "flex" : "hidden"} h-full min-h-0 lg:col-span-4 lg:flex`}>
          <NowPlayingStage
            playback={room.playback}
            participants={room.participants}
            selfId={room.selfId}
            together={room.together}
            currentSec={currentSec}
            durationSec={durationSec}
            volume={volume}
            lyricLine={activeLyric}
            code={room.code}
            onTogglePlay={room.actions.togglePlay}
            onPrev={room.actions.prev}
            onNext={room.actions.next}
            onSeek={room.actions.seek}
            onVolume={setVolume}
            onHeart={() => room.actions.react("❤️")}
            onCopyInvite={() => void handleCopyCode()}
          />
        </section>

        <section className={`${mobileTab === "chat" ? "flex" : "hidden"} h-full min-h-0 lg:col-span-4 lg:flex`}>
          <ChatPanel
            participants={room.participants}
            messages={room.messages}
            selfId={room.selfId}
            typingNames={room.typingNames}
            onSend={room.actions.sendChat}
            onTyping={room.actions.setTyping}
            onReact={room.actions.react}
          />
        </section>
      </div>

      {/* Compact Mobile / Tablet Switcher so small screens also stay strictly 1-page */}
      <nav className="glass grid shrink-0 grid-cols-3 gap-1 rounded-full p-1 lg:hidden" aria-label="Room panels">
        <button
          type="button"
          onClick={() => setMobileTab("music")}
          className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition ${
            mobileTab === "music" ? "bg-white/20 text-[var(--ink)]" : "text-[var(--ink-faint)]"
          }`}
        >
          <ListMusic className="h-4 w-4" />
          <span>Music{room.queue.length ? ` (${room.queue.length})` : ""}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("stage")}
          className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition ${
            mobileTab === "stage" ? "bg-white/20 text-[var(--ink)]" : "text-[var(--ink-faint)]"
          }`}
        >
          <Disc3 className="h-4 w-4" />
          <span>Vinyl</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`relative flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition ${
            mobileTab === "chat" ? "bg-white/20 text-[var(--ink)]" : "text-[var(--ink-faint)]"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>Chat</span>
          {unreadChat > 0 && (
            <span className="rounded-full bg-[var(--rose)] px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-[#2b1416]">
              {unreadChat > 9 ? "9+" : unreadChat}
            </span>
          )}
        </button>
      </nav>
    </main>
  );
}
