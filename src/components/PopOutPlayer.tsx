"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { PictureInPicture2 } from "lucide-react";
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

const btn: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer"
};

/**
 * Small always-on-top mini player (Document Picture-in-Picture, like Google Meet's pop-out).
 * Only renders its button in browsers that support it (desktop Chrome / Edge).
 * Audio keeps playing in the main tab; this window is just a floating remote.
 */
export function PopOutPlayer({ track, isPlaying, currentSec, durationSec, onTogglePlay, onPrev, onNext }: PopOutPlayerProps) {
  const [supported, setSupported] = useState(false);
  const [pipWin, setPipWin] = useState<Window | null>(null);

  useEffect(() => {
    setSupported("documentPictureInPicture" in window);
  }, []);

  // Close the pop-out if this component goes away.
  useEffect(() => () => pipWin?.close(), [pipWin]);

  if (!supported) return null;

  const open = async () => {
    if (pipWin) {
      pipWin.close();
      return;
    }
    try {
      const api = (window as unknown as { documentPictureInPicture: PipApi }).documentPictureInPicture;
      const win = await api.requestWindow({ width: 340, height: 130 });
      win.document.body.style.cssText =
        "margin:0;background:#140d10;color:#fff;font-family:system-ui,sans-serif;overflow:hidden";
      win.addEventListener("pagehide", () => setPipWin(null));
      setPipWin(win);
    } catch {
      // Browser refused (e.g. no user gesture) — nothing to do.
    }
  };

  const progress = durationSec > 0 ? Math.min(100, Math.max(0, (currentSec / durationSec) * 100)) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        aria-label={pipWin ? "Close mini player" : "Pop out mini player"}
        title="Pop out mini player"
        className={`btn-soft flex h-10 w-10 items-center justify-center rounded-full ${
          pipWin ? "border-[var(--amber)]/50 text-[var(--honey)]" : ""
        }`}
      >
        <PictureInPicture2 className="h-4 w-4" />
      </button>

      {pipWin &&
        createPortal(
          <div style={{ display: "flex", gap: 12, padding: 12, alignItems: "center", height: "100%", boxSizing: "border-box" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {track && <img src={track.coverUrl} alt="" width={64} height={64} style={{ borderRadius: 12, objectFit: "cover" }} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {track ? track.title : "Nothing playing"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {track ? track.artist : "Pick a song in Rooftop.fm"}
              </div>
              <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.15)", margin: "8px 0" }}>
                <div style={{ width: `${progress}%`, height: "100%", borderRadius: 4, background: "#ffb36b" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btn} onClick={onPrev} aria-label="Previous">⏮</button>
                <button type="button" style={btn} onClick={onTogglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <button type="button" style={btn} onClick={onNext} aria-label="Next">⏭</button>
              </div>
            </div>
          </div>,
          pipWin.document.body
        )}
    </>
  );
}

