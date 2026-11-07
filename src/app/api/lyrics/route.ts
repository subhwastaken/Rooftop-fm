import { NextRequest, NextResponse } from "next/server";
import type { LyricLine } from "@/lib/types";

interface LrcLibItem {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

  for (const rawLine of lrc.split("\n")) {
    const match = rawLine.match(regex);
    if (!match) continue;
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const frac = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) / 1000 : 0;
    const text = match[4].trim();
    if (text) {
      lines.push({
        timeSec: mins * 60 + secs + frac,
        text
      });
    }
  }
  return lines.sort((a, b) => a.timeSec - b.timeSec);
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim() || "";
  const artist = req.nextUrl.searchParams.get("artist")?.trim() || "";

  if (!title) {
    return NextResponse.json({ synced: [], plain: null });
  }

  try {
    // Strip "(Official Audio)" or similar noise for cleaner lyrics lookup
    const cleanTitle = title.replace(/\((official|audio|video|lyrics).*?\)/gi, "").trim();
    const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(artist)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "RooftopFM-SyncedDeck/1.0" },
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      return NextResponse.json({ synced: [], plain: null });
    }

    const items = (await res.json()) as LrcLibItem[];
    const withSynced = items.find((item) => item.syncedLyrics);
    if (withSynced?.syncedLyrics) {
      return NextResponse.json({
        synced: parseLrc(withSynced.syncedLyrics),
        plain: withSynced.plainLyrics || null
      });
    }

    const withPlain = items.find((item) => item.plainLyrics);
    return NextResponse.json({
      synced: [],
      plain: withPlain?.plainLyrics || null
    });
  } catch {
    return NextResponse.json({ synced: [], plain: null });
  }
}

