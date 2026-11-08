"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Pause, PictureInPicture2, Play, SkipBack, SkipForward } from "lucide-react";
import type { TrackItem } from "@/lib/types";

interface PipApi {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
}

interface PopOutPlayerProps {
  track: TrackItem | null;
  isPlaying: boolean;
  currentSec: number;
  durationSec: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
}

const sideBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff5ea",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0
};

const playBtn: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg, #ffb36b 0%, #f38ba0 100%)",
  color: "#2b1416",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  boxShadow: "0 4px 12px rgba(255, 179, 107, 0.35)"
};

/**
 * Compact always-on-top mini vinyl player (Document Picture-in-Picture, like Google Meet's pop-out).
 * Only renders on desktop browsers that support Document PiP (Chrome / Edge / Brave / Arc).
 */
export function PopOutPlayer({
  track,
  isPlaying,
  currentSec,
  durationSec,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek
}: PopOutPlayerProps) {
  const [supported, setSupported] = useState(false);
  const [pipWin, setPipWin] = useState<Window | null>(null);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [seekingTo, setSeekingTo] = useState<number | null>(null);

  useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setSupported(!isMobile && "documentPictureInPicture" in window);
  }, []);

  // Close the pop-out if this component unmounts.
  useEffect(() => () => pipWin?.close(), [pipWin]);

  // Hold optimistic seek position until player catches up so the slider never bounces back.
  useEffect(() => {
    if (seekingTo !== null) {
      if (Math.abs(currentSec - seekingTo) <= 1.5) {
        setSeekingTo(null);
      } else {
        const timer = window.setTimeout(() => setSeekingTo(null), 2500);
        return () => window.clearTimeout(timer);
      }
    }
  }, [currentSec, seekingTo]);

  if (!supported) return null;

  const open = async () => {
    if (pipWin) {
      pipWin.close();
      return;
    }
    try {
      const api = (window as unknown as { documentPictureInPicture: PipApi }).documentPictureInPicture;
      const win = await api.requestWindow({ width: 280, height: 108 });
      win.document.title = "Rooftop.fm";
      win.document.body.style.cssText =
        "margin:0;background:radial-gradient(circle at 20% 20%, #2a1820 0%, #140d10 100%);color:#fff5ea;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;user-select:none;";
      const style = win.document.createElement("style");
      style.textContent = `
        @keyframes pip-vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button:hover { filter: brightness(1.12); transform: scale(1.05); }
        button:active { transform: scale(0.95); }
        button { transition: transform 0.15s ease, filter 0.15s ease; }
        input.pip-scrub {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 5px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffb36b 0%, #f38ba0 var(--p, 0%), rgba(255,255,255,0.16) var(--p, 0%));
          outline: none;
          cursor: pointer;
          margin: 6px 0;
        }
        input.pip-scrub:disabled { cursor: default; opacity: 0.5; }
        input.pip-scrub::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #fff5ea;
          box-shadow: 0 0 0 3px rgba(255, 179, 107, 0.35), 0 1px 4px rgba(0,0,0,0.6);
          transition: transform 0.12s ease;
        }
        input.pip-scrub:not(:disabled):hover::-webkit-slider-thumb,
        input.pip-scrub:not(:disabled):active::-webkit-slider-thumb {
          transform: scale(1.22);
        }
      `;
      win.document.head.appendChild(style);
      win.addEventListener("pagehide", () => setPipWin(null));
      setPipWin(win);
    } catch {
      // Browser refused — nothing to do.
    }
  };

  const duration = durationSec > 0 ? durationSec : (track?.durationSec ?? 0);
  const isLive = Boolean(track) && duration <= 0;
  const shown = scrubbing ?? seekingTo ?? currentSec;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const spinning = Boolean(track && isPlaying);
  const armAngle = spinning ? 10 + progressRatio * 7 : -4;

  const commitSeek = (explicitVal?: number) => {
    const target =
      explicitVal !== undefined && !isNaN(explicitVal)
        ? explicitVal
        : scrubbing !== null
        ? scrubbing
        : seekingTo;
    if (target !== null && target !== undefined && !isNaN(target)) {
      setSeekingTo(target);
      onSeek(target);
      setScrubbing(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        aria-label={pipWin ? "Close mini player" : "Pop out mini player"}
        title="Pop out mini player"
        className={`btn-soft hidden h-10 w-10 items-center justify-center rounded-full sm:flex ${
          pipWin ? "border-[var(--amber)]/50 text-[var(--honey)]" : ""
        }`}
      >
        <PictureInPicture2 className="h-4 w-4" />
      </button>

      {pipWin &&
        createPortal(
          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "10px 14px",
              alignItems: "center",
              height: "100vh",
              boxSizing: "border-box"
            }}
          >
            {/* Turntable unit: rotating mini vinyl disc + miniature tonearm */}
            <div style={{ position: "relative", width: 68, height: 64, flexShrink: 0 }}>
              <div
                style={{
                  position: "relative",
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.16) 35deg, transparent 75deg, transparent 180deg, rgba(255,179,107,0.18) 215deg, transparent 255deg), repeating-radial-gradient(circle at center, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px), radial-gradient(circle, #1e1417 0%, #0b0709 100%)",
                  boxShadow: spinning
                    ? "0 4px 16px rgba(255, 179, 107, 0.25), inset 0 0 0 2px rgba(255,255,255,0.12)"
                    : "0 4px 12px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "pip-vinyl-spin 8s linear infinite",
                  animationPlayState: spinning ? "running" : "paused"
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={track ? track.coverUrl : "/favicon-96x96.png"}
                  alt=""
                  width={38}
                  height={38}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1.5px solid rgba(255, 214, 165, 0.4)"
                  }}
                />
                {/* Center spindle hole */}
                <span
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#140d10",
                    border: "1.5px solid #ffb36b"
                  }}
                />
              </div>

              {/* Miniature tonearm rod on top-right of the vinyl */}
              <svg
                viewBox="0 0 130 260"
                style={{
                  position: "absolute",
                  right: -8,
                  top: -4,
                  width: 32,
                  height: 60,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.65))"
                }}
                fill="none"
                aria-hidden
              >
                <circle cx="86" cy="38" r="14.5" fill="#24141e" stroke="#ffe3dd" strokeWidth="3.5" />
                <circle cx="86" cy="38" r="7.5" fill="#c28cae" />
                <circle cx="86" cy="38" r="2.5" fill="#24141e" />
                <line x1="85" y1="94" x2="85" y2="108" stroke="#ffe3dd" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 80 96 Q 85 100 90 96" stroke="#ffe3dd" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <g
                  style={{
                    transformOrigin: "86px 38px",
                    transform: `rotate(${armAngle}deg)`,
                    transition: "transform 0.75s cubic-bezier(0.25, 1, 0.45, 1)"
                  }}
                >
                  <rect x="79" y="11" width="14" height="14" rx="4" fill="#c28cae" stroke="#24141e" strokeWidth="2.5" />
                  <line x1="86" y1="25" x2="86" y2="38" stroke="#ffe3dd" strokeWidth="4" strokeLinecap="round" />
                  <path
                    d="M 86 38 L 86 68 C 86 110 74 140 64 170 C 56 190 53 210 53 226"
                    stroke="#ffe3dd"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <g transform="translate(53, 226) rotate(10)">
                    <rect x="-6" y="2" width="12" height="18" rx="4" fill="#ff7e5f" stroke="#24141e" strokeWidth="2.5" />
                    <circle cx="0" cy="22" r="2.5" fill="#ffe3dd" />
                  </g>
                </g>
              </svg>
            </div>

            {/* Track info + interactive seek bar + centered controls */}
            <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: "center"
                }}
              >
                {track ? track.title : "Nothing playing"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.65,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: "center"
                }}
              >
                {track ? track.artist : "Pick a song in Rooftop.fm"}
              </div>

              <input
                type="range"
                className="pip-scrub"
                min={0}
                max={isLive ? 1 : Math.max(1, Math.floor(duration))}
                step={1}
                value={isLive ? 0 : Math.min(Math.floor(shown), Math.max(1, Math.floor(duration)))}
                disabled={!track || isLive}
                aria-label="Seek song position"
                style={{ "--p": `${progressRatio * 100}%` } as CSSProperties}
                onPointerDown={(e) => setScrubbing(Number((e.target as HTMLInputElement).value))}
                onChange={(e) => setScrubbing(Number(e.target.value))}
                onPointerUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
                onKeyUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
                onBlur={() => commitSeek()}
              />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <button type="button" style={sideBtn} onClick={onPrev} aria-label="Previous">
                  <SkipBack style={{ width: 13, height: 13, fill: "currentColor" }} />
                </button>
                <button type="button" style={playBtn} onClick={onTogglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? (
                    <Pause style={{ width: 14, height: 14, fill: "currentColor" }} />
                  ) : (
                    <Play style={{ width: 14, height: 14, fill: "currentColor", marginLeft: 1 }} />
                  )}
                </button>
                <button type="button" style={sideBtn} onClick={onNext} aria-label="Next">
                  <SkipForward style={{ width: 13, height: 13, fill: "currentColor" }} />
                </button>
              </div>
            </div>
          </div>,
          pipWin.document.body
        )}
    </>
  );
}
