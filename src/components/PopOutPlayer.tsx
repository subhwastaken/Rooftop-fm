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
export function PopOutPlayer({ track, isPlaying, currentSec, durationSec, onTogglePlay, onPrev, onNext }: PopOutPlayerProps) {
  const [supported, setSupported] = useState(false);
  const [pipWin, setPipWin] = useState<Window | null>(null);

  useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setSupported(!isMobile && "documentPictureInPicture" in window);
  }, []);

  // Close the pop-out if this component unmounts.
  useEffect(() => () => pipWin?.close(), [pipWin]);

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
      `;
      win.document.head.appendChild(style);
      win.addEventListener("pagehide", () => setPipWin(null));
      setPipWin(win);
    } catch {
      // Browser refused — nothing to do.
    }
  };

  const progress = durationSec > 0 ? Math.min(100, Math.max(0, (currentSec / durationSec) * 100)) : 0;
  const spinning = Boolean(track && isPlaying);

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
              gap: 12,
              padding: "10px 14px",
              alignItems: "center",
              height: "100vh",
              boxSizing: "border-box"
            }}
          >
            {/* Rotating mini vinyl disc */}
            <div
              style={{
                position: "relative",
                width: 64,
                height: 64,
                flexShrink: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, #1e1417 0 18%, #0d080a 19% 100%), repeating-radial-gradient(circle at center, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px)",
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

            {/* Track info + progress + centered controls */}
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

              <div
                style={{
                  height: 3.5,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  margin: "7px 0",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #ffb36b, #f38ba0)",
                    transition: "width 0.3s linear"
                  }}
                />
              </div>

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
