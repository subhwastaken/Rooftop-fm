"use client";

import { useEffect, useState } from "react";
import { Copy, Heart, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { ToneArm } from "./ToneArm";
import { Avatar } from "./Avatar";
import { formatClock } from "@/lib/identity";
import type { TogetherClock } from "@/lib/useRoom";
import type { Participant, PlaybackState } from "@/lib/types";

interface NowPlayingStageProps {
  playback: PlaybackState;
  participants: Participant[];
  selfId: string;
  together: TogetherClock;
  currentSec: number;
  durationSec: number;
  volume: number;
  lyricLine: string | null;
  code: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onVolume: (value: number) => void;
  onHeart: () => void;
  onCopyInvite: () => void;
}

const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function cleanActionText(text: string | null): string | null {
  if (!text) return null;
  // Handles "[Name] put on ...", "[Name] jumped to ...", "[Name] played "..."", etc. with straight or curly quotes
  const match = text.match(/^(.+?)\s+(?:put on|jumped to|played\s+["“]|queued\s+["“])/i);
  if (match) {
    return `${match[1].trim()} played a new song`;
  }
  return text;
}

function TogetherTime({ together }: { together: TogetherClock }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!together.active) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [together.active]);

  const ms = together.baseMs + (together.active ? Date.now() - together.at : 0);
  return <>{formatClock(ms / 1000)}</>;
}

export function NowPlayingStage({
  playback,
  participants,
  selfId,
  together,
  currentSec,
  durationSec,
  volume,
  lyricLine,
  code,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onHeart,
  onCopyInvite
}: NowPlayingStageProps) {
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [hearted, setHearted] = useState(false);

  const track = playback.currentTrack;
  const duration = durationSec > 0 ? durationSec : (track?.durationSec ?? 0);
  const isLive = Boolean(track) && duration <= 0;
  const shown = scrubbing ?? currentSec;
  const progress = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;

  const others = participants.filter((p) => p.socketId !== selfId);
  const alone = others.length === 0;
  const together_ = !alone;

  const commitSeek = () => {
    if (scrubbing !== null) {
      onSeek(scrubbing);
      setScrubbing(null);
    }
  };

  const sendHeart = () => {
    onHeart();
    setHearted(true);
    window.setTimeout(() => setHearted(false), 400);
  };

  return (
    <div className="glass flex h-full min-h-0 w-full flex-col items-center justify-between gap-3 overflow-hidden px-5 py-5 sm:px-8">
      {/* Record */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative aspect-square h-[min(36dvh,300px)] max-h-full">
          <span
            className="absolute -inset-6 rounded-full bg-[var(--amber)]/30 blur-3xl animate-breathe"
            style={{ animationPlayState: playback.isPlaying ? "running" : "paused" }}
          />

          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="progress-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffb36b" />
                <stop offset="100%" stopColor="#ff8fa0" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="rgba(255,232,206,0.14)" strokeWidth="1.2" />
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              stroke="url(#progress-ring)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>

          <div className="absolute inset-[5%] rounded-full shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]">
            <div
              className="vinyl-grooves absolute inset-0 rounded-full animate-vinyl"
              style={{ animationPlayState: playback.isPlaying ? "running" : "paused" }}
            >
              <div className="absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-black/50 bg-[#2a1b1d]">
                {track?.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                )}
                <span className="absolute left-1/2 top-1/2 h-[9%] w-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#140d10] ring-1 ring-white/20" />
              </div>
            </div>
            <div className="vinyl-sheen pointer-events-none absolute inset-0 rounded-full" />
          </div>

          {/* Authentic Hi-Fi Tonearm that tracks across the record grooves */}
          <ToneArm isPlaying={playback.isPlaying} progress={progress} />
        </div>
      </div>

      {/* Title / helper */}
      <div className="flex min-h-[5.5rem] w-full max-w-md flex-col items-center justify-start text-center">
        {track ? (
          <>
            <h2 className="line-clamp-2 font-display text-2xl font-semibold leading-tight">{track.title}</h2>
            <p className="mt-1 max-w-full truncate text-sm font-semibold text-[var(--ink-soft)]">{track.artist}</p>
            <p className="mt-2 h-5 max-w-full truncate font-display text-sm italic text-[var(--honey)]">
              {lyricLine ?? ""}
            </p>
          </>
        ) : alone ? (
          <>
            <h2 className="font-display text-2xl font-semibold">Waiting for your person</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Send them this code — the music starts when you&apos;re both here.</p>
            <button
              onClick={onCopyInvite}
              className="btn-soft mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
            >
              <span className="font-display text-lg tracking-[0.18em]">{code}</span>
              <Copy className="h-4 w-4 opacity-70" />
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold">You&apos;re both here</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Search for a song to play it for everyone at once.</p>
          </>
        )}
      </div>

      {/* Progress */}
      <div className="w-full max-w-md">
        <input
          type="range"
          className="scrub"
          min={0}
          max={isLive ? 1 : Math.max(1, Math.floor(duration))}
          step={1}
          value={isLive ? 0 : Math.min(Math.floor(shown), Math.max(1, Math.floor(duration)))}
          disabled={!track || isLive}
          aria-label="Song position, shared with everyone"
          style={{ "--p": `${progress * 100}%` } as React.CSSProperties}
          onChange={(e) => setScrubbing(Number(e.target.value))}
          onPointerUp={commitSeek}
          onKeyUp={commitSeek}
          onBlur={commitSeek}
        />
        <div className="mt-1.5 flex justify-between text-xs font-semibold tabular-nums text-[var(--ink-faint)]">
          <span>{formatClock(shown)}</span>
          <span>{isLive ? "LIVE" : track ? formatClock(duration) : "0:00"}</span>
        </div>
      </div>

      {/* Transport */}
      <div className="relative flex w-full max-w-md items-center justify-center">
        {/* Left: volume slider on desktop, quick mute toggle on mobile */}
        <div className="absolute left-0 flex items-center gap-2">
          <button
            onClick={() => onVolume(volume === 0 ? 80 : 0)}
            className="btn-soft flex h-12 w-12 items-center justify-center rounded-full text-[var(--ink-faint)] transition hover:text-[var(--ink)] sm:h-10 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0"
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            title="Only changes your own volume"
          >
            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="hidden w-20 sm:block">
            <input
              type="range"
              className="scrub"
              min={0}
              max={100}
              value={volume}
              aria-label="Your volume"
              style={{ "--p": `${volume}%` } as React.CSSProperties}
              onChange={(e) => onVolume(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Center: Play / Pause / Prev / Next — perfectly centered on all devices */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={!track}
            aria-label="Previous"
            className="btn-soft flex h-12 w-12 items-center justify-center rounded-full"
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!track}
            aria-label={playback.isPlaying ? "Pause for everyone" : "Play for everyone"}
            className="btn-primary flex h-16 w-16 items-center justify-center rounded-full"
          >
            {playback.isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
          </button>
          <button
            onClick={onNext}
            disabled={!track}
            aria-label="Next"
            className="btn-soft flex h-12 w-12 items-center justify-center rounded-full"
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </button>
        </div>

        {/* Right: Floating Heart Reaction */}
        <div className="absolute right-0 flex items-center justify-end">
          <button
            onClick={sendHeart}
            aria-label="Send a heart"
            title="Send a heart"
            className="btn-soft flex h-12 w-12 items-center justify-center rounded-full"
          >
            <Heart className={`h-5 w-5 fill-[var(--rose)] text-[var(--rose)] ${hearted ? "animate-pop" : ""}`} />
          </button>
        </div>
      </div>

      {/* Presence */}
      <div className="flex w-full max-w-md flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2.5">
            {participants.slice(0, 5).map((p) => (
              <span key={p.socketId} className="relative">
                {playback.isPlaying && (
                  <span
                    className="absolute inset-0 rounded-full animate-ripple"
                    style={{ boxShadow: `0 0 0 2px ${p.color}` }}
                  />
                )}
                <span
                  className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#2a1b1d] shadow-sm"
                  style={{ backgroundColor: `${p.color}55` }}
                  title={p.name}
                >
                  <Avatar src={p.emoji} name={p.name} size={72} className="h-full w-full object-cover" />
                </span>
              </span>
            ))}
          </div>
          <p className="text-sm font-semibold text-[var(--ink-soft)]">
            {alone
              ? "Just you for now"
              : `${participants.length} here · ${playback.isPlaying ? "listening together" : "paused together"}`}
          </p>
        </div>
        <p className="h-4 text-xs text-[var(--ink-faint)]">
          {together_ && together.active ? (
            <>
              Together for <span className="font-bold tabular-nums text-[var(--honey)]"><TogetherTime together={together} /></span>
              {cleanActionText(playback.lastActionBy) ? <> · {cleanActionText(playback.lastActionBy)}</> : null}
            </>
          ) : (
            (cleanActionText(playback.lastActionBy) ?? "")
          )}
        </p>
      </div>
    </div>
  );
}

