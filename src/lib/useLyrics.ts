"use client";

import { useEffect, useState } from "react";
import type { LyricLine, TrackItem } from "./types";

export interface LyricsState {
  synced: LyricLine[];
  plain: string | null;
  loading: boolean;
}

const EMPTY: LyricsState = { synced: [], plain: null, loading: false };

export function useLyrics(track: TrackItem | null): LyricsState {
  const [state, setState] = useState<LyricsState>(EMPTY);
  const id = track?.id ?? null;
  const title = track?.title ?? null;
  const artist = track?.artist ?? null;

  useEffect(() => {
    if (!id || !title) {
      setState(EMPTY);
      return;
    }

    let cancelled = false;
    setState({ synced: [], plain: null, loading: true });

    fetch(`/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist ?? "")}`)
      .then((res) => res.json())
      .then((data: { synced?: LyricLine[]; plain?: string | null }) => {
        if (!cancelled) setState({ synced: data.synced ?? [], plain: data.plain ?? null, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState(EMPTY);
      });

    return () => {
      cancelled = true;
    };
  }, [id, title, artist]);

  return state;
}

export function activeLyricIndex(lines: LyricLine[], currentSec: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (currentSec + 0.25 >= lines[i].timeSec) active = i;
    else break;
  }
  return active;
}

