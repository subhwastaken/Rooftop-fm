import { NextRequest, NextResponse } from "next/server";
import ytSearch from "yt-search";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400"
};

const resolveCache = new Map<string, { youtubeId: string; durationSec: number }>();

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim() || "";
  const artist = req.nextUrl.searchParams.get("artist")?.trim() || "";
  const expectedDuration = Number(req.nextUrl.searchParams.get("duration") || "0");

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const cacheKey = `${artist.toLowerCase()}::${title.toLowerCase()}`;
  const cached = resolveCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: CACHE_HEADERS });
  }

  try {
    const query = `${artist} - ${title} official audio`.trim();
    const res = await ytSearch(query);
    const candidates = res.videos.slice(0, 6);

    if (candidates.length === 0) {
      return NextResponse.json({ error: "No playable stream found" }, { status: 404 });
    }

    // Score candidates: prefer Official Audio / Topic channels and close duration match
    let best = candidates[0];
    let bestScore = -Infinity;

    for (const video of candidates) {
      let score = 0;
      const lowerTitle = video.title.toLowerCase();
      const lowerAuthor = (video.author?.name || "").toLowerCase();

      if (lowerTitle.includes("official audio") || lowerTitle.includes("audio")) score += 30;
      if (lowerAuthor.includes("topic")) score += 35;
      if (artist && (lowerTitle.includes(artist.toLowerCase()) || lowerAuthor.includes(artist.toLowerCase()))) {
        score += 25;
      }
      if (lowerTitle.includes("1 hour") || lowerTitle.includes("slowed") || lowerTitle.includes("karaoke")) {
        if (!title.toLowerCase().includes("slowed")) score -= 40;
      }

      if (expectedDuration > 0 && video.seconds > 0) {
        const diff = Math.abs(video.seconds - expectedDuration);
        if (diff <= 8) score += 40;
        else if (diff <= 25) score += 20;
        else if (diff > 120) score -= 35;
      }

      if (score > bestScore) {
        bestScore = score;
        best = video;
      }
    }

    const payload = {
      youtubeId: best.videoId,
      durationSec: best.seconds || expectedDuration || 0
    };

    if (resolveCache.size > 500) {
      const firstKey = resolveCache.keys().next().value;
      if (firstKey) resolveCache.delete(firstKey);
    }
    resolveCache.set(cacheKey, payload);

    return NextResponse.json(payload, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json({ error: "Failed to resolve audio" }, { status: 500 });
  }
}

