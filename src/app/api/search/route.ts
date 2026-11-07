import { NextRequest, NextResponse } from "next/server";
import ytSearch from "yt-search";
import type { SearchResultItem } from "@/lib/types";

export const runtime = "nodejs";

function extractYouTubeId(input: string): string | null {
  const match = input.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function isSpotifyTrackUrl(input: string): boolean {
  return /open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(input);
}

async function resolveSpotifyLink(url: string): Promise<SearchResultItem | null> {
  try {
    const oembedRes = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { cache: "no-store" }
    );
    if (!oembedRes.ok) return null;
    const oembed = (await oembedRes.json()) as { title?: string; thumbnail_url?: string };

    // Also try reading Spotify page og:description for artist name ("Artist · Song · Year")
    let artist = "Spotify Import";
    const title = oembed.title || "Track";
    try {
      const htmlRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store"
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
        if (descMatch?.[1]) {
          const parts = descMatch[1].split("·").map((s) => s.trim());
          if (parts[0]) artist = parts[0];
        }
      }
    } catch {
      // Fallback to oEmbed title alone
    }

    const yt = await ytSearch(`${title} ${artist !== "Spotify Import" ? artist : ""} official audio`);
    const best = yt.videos[0];
    if (!best) return null;

    return {
      id: `sp-${best.videoId}`,
      title,
      artist: artist === "Spotify Import" ? best.author.name : artist,
      coverUrl: oembed.thumbnail_url || best.thumbnail || `https://i.ytimg.com/vi/${best.videoId}/hqdefault.jpg`,
      durationSec: best.seconds || 0,
      youtubeId: best.videoId,
      source: "spotify-link"
    };
  } catch {
    return null;
  }
}

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Direct YouTube / YouTube Music link
    const ytId = extractYouTubeId(q);
    if (ytId) {
      const video = await ytSearch({ videoId: ytId });
      const item: SearchResultItem = {
        id: `yt-${video.videoId}`,
        title: video.title,
        artist: video.author?.name || "YouTube Audio",
        coverUrl: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        durationSec: video.seconds || 0,
        youtubeId: video.videoId,
        source: "youtube"
      };
      return NextResponse.json({ results: [item] });
    }

    // 2. Direct Spotify Track link (free, no Premium required!)
    if (isSpotifyTrackUrl(q)) {
      const spItem = await resolveSpotifyLink(q);
      if (spItem) {
        return NextResponse.json({ results: [spItem] });
      }
    }

    // 3. Clean Catalog Search via iTunes API (crisp album art + track metadata)
    const itunesUrl = `https://itunes.apple.com/search?media=music&entity=song&limit=7&term=${encodeURIComponent(q)}`;
    const itunesRes = await fetch(itunesUrl, { next: { revalidate: 300 } });

    const results: SearchResultItem[] = [];
    if (itunesRes.ok) {
      const data = (await itunesRes.json()) as { results?: ItunesTrack[] };
      for (const t of data.results || []) {
        const hiResCover = (t.artworkUrl100 || "").replace("100x100bb", "600x600bb");
        results.push({
          id: `cat-${t.trackId}`,
          title: t.trackName,
          artist: t.artistName,
          album: t.collectionName,
          coverUrl: hiResCover,
          durationSec: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : 0,
          source: "catalog"
        });
      }
    }

    // Fallback or supplement with direct YouTube audio search (great for lofi mixes, covers, remixes)
    if (results.length < 3) {
      const yt = await ytSearch(q);
      for (const v of yt.videos.slice(0, 6)) {
        results.push({
          id: `yt-${v.videoId}`,
          title: v.title,
          artist: v.author?.name || "YouTube",
          coverUrl: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          durationSec: v.seconds || 0,
          youtubeId: v.videoId,
          source: "youtube"
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], error: "Search temporarily unavailable" }, { status: 500 });
  }
}

