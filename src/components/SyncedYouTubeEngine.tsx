"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackState } from "@/lib/types";

interface YTPlayer {
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (vol: number) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// YouTube player states we care about
const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_BUFFERING = 3;

// Tight sync tolerance: keeps both listeners locked to the exact beat (< 350ms offset)
const DRIFT_TOLERANCE_SEC = 0.35;

interface SyncedAudioEngineProps {
  playback: PlaybackState;
  clockOffsetMs: number;
  volume: number;
  showVideo: boolean;
  onProgress: (currentSec: number, durationSec: number) => void;
  onTrackEnded: (trackId: string) => void;
}

/**
 * Plays the room's current track and keeps it locked to the shared timeline.
 * The player lives outside the layout (off-screen, or a small floating window when video is on).
 */
export function SyncedAudioEngine({
  playback,
  clockOffsetMs,
  volume,
  showVideo,
  onProgress,
  onTrackEnded
}: SyncedAudioEngineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const loadedVideoIdRef = useRef<string | null>(null);
  const playbackRef = useRef(playback);
  const clockOffsetRef = useRef(clockOffsetMs);
  const volumeRef = useRef(volume);
  const onTrackEndedRef = useRef(onTrackEnded);
  const [needsTap, setNeedsTap] = useState(false);

  playbackRef.current = playback;
  clockOffsetRef.current = clockOffsetMs;
  volumeRef.current = volume;
  onTrackEndedRef.current = onTrackEnded;

  const expectedPosition = useCallback((state: PlaybackState): number => {
    if (!state.currentTrack) return 0;
    if (!state.isPlaying) return state.positionSec;
    const serverNow = Date.now() + clockOffsetRef.current;
    return state.positionSec + Math.max(0, (serverNow - state.updatedAt) / 1000);
  }, []);

  const applyState = useCallback(
    (state: PlaybackState) => {
      const player = playerRef.current;
      if (!player || !readyRef.current || !state.currentTrack) return;

      const videoId = state.currentTrack.youtubeId;
      const expected = expectedPosition(state);

      if (loadedVideoIdRef.current !== videoId) {
        loadedVideoIdRef.current = videoId;
        if (state.isPlaying) player.loadVideoById({ videoId, startSeconds: expected });
        else player.cueVideoById({ videoId, startSeconds: expected });
        return;
      }

      const isLive = state.currentTrack.durationSec === 0 && Number(player.getDuration?.() || 0) === 0;
      if (!isLive && Math.abs(Number(player.getCurrentTime?.() || 0) - expected) > DRIFT_TOLERANCE_SEC) {
        player.seekTo(expected, true);
      }

      const ytState = player.getPlayerState?.();
      if (state.isPlaying && ytState !== STATE_PLAYING && ytState !== STATE_BUFFERING) player.playVideo();
      else if (!state.isPlaying && ytState === STATE_PLAYING) player.pauseVideo();
    },
    [expectedPosition]
  );

  // Load the YouTube IFrame API and create the player once.
  useEffect(() => {
    let cancelled = false;

    const createPlayer = () => {
      if (cancelled || !containerRef.current || !window.YT?.Player || playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "100%",
        width: "100%",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            readyRef.current = true;
            e.target.setVolume(volumeRef.current);
            applyState(playbackRef.current);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            if (e.data === STATE_PLAYING) {
              setNeedsTap(false);
              // If the room is paused, never let a stray play slip through.
              if (!playbackRef.current.isPlaying) {
                e.target.pauseVideo();
                return;
              }
              // Immediately snap to the shared timeline as soon as buffering completes
              const expected = expectedPosition(playbackRef.current);
              const current = Number(e.target.getCurrentTime?.() || 0);
              if (Math.abs(current - expected) > 0.25) {
                e.target.seekTo(expected, true);
              }
            }
            if (e.data === STATE_ENDED && playbackRef.current.currentTrack) {
              onTrackEndedRef.current(playbackRef.current.currentTrack.id);
            }
          }
        }
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        createPlayer();
      };
    }

    return () => {
      cancelled = true;
      readyRef.current = false;
      loadedVideoIdRef.current = null;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [applyState, expectedPosition]);

  // Follow every shared playback change immediately.
  useEffect(() => {
    applyState(playback);
  }, [playback, applyState]);

  useEffect(() => {
    if (playerRef.current && readyRef.current) playerRef.current.setVolume(volume);
  }, [volume]);

  // Progress ticker, gentle drift correction, and autoplay-block detection.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      const state = playbackRef.current;
      if (!player || !readyRef.current || !state.currentTrack) return;

      const ytState = player.getPlayerState?.();
      const current = Number(player.getCurrentTime?.() || 0);
      const duration = Number(player.getDuration?.() || state.currentTrack.durationSec || 0);
      const expected = expectedPosition(state);

      onProgress(state.isPlaying && ytState === STATE_PLAYING ? current : expected, duration);

      if (state.isPlaying && ytState !== STATE_PLAYING && ytState !== STATE_BUFFERING) {
        player.playVideo();
        window.setTimeout(() => {
          const recheck = playerRef.current?.getPlayerState?.();
          if (playbackRef.current.isPlaying && recheck !== STATE_PLAYING && recheck !== STATE_BUFFERING) {
            setNeedsTap(true);
          }
        }, 900);
      }

      const isLive = duration === 0 && state.currentTrack.durationSec === 0;
      if (state.isPlaying && ytState === STATE_PLAYING && !isLive && Math.abs(current - expected) > DRIFT_TOLERANCE_SEC) {
        player.seekTo(expected, true);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [expectedPosition, onProgress]);

  const unlock = () => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    setNeedsTap(false);
    player.seekTo(expectedPosition(playbackRef.current), true);
    player.playVideo();
  };

  return (
    <>
      {needsTap && playback.isPlaying && (
        <div className="glass-strong fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2.5 animate-rise-in">
          <span className="text-sm font-semibold text-[var(--ink)]">Your browser is holding back the sound</span>
          <button onClick={unlock} className="btn-primary rounded-full px-4 py-1.5 text-xs">
            Tap to join in
          </button>
        </div>
      )}

      <div
        className={
          showVideo
            ? "fixed bottom-20 right-3 z-40 aspect-video w-[300px] overflow-hidden rounded-2xl border border-[var(--line)] bg-black shadow-2xl lg:bottom-4 lg:left-4 lg:right-auto"
            : "pointer-events-none fixed -left-[9999px] top-0 h-[180px] w-[320px] opacity-0"
        }
      >
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </>
  );
}
