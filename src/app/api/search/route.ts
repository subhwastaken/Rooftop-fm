import { NextRequest, NextResponse } from "next/server";
import ytSearch from "yt-search";
import type { SearchResultItem } from "@/lib/types";

export const runtime = "nodejs";

function extractYouTubeId(input: string): string | null {
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/
  );
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
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
    // 1. Direct YouTube / YouTube Music link (instant resolution via lightweight oEmbed API)
    const ytId = extractYouTubeId(q);
    if (ytId) {
      let title = "YouTube Audio";
      let artist = "YouTube";
      let coverUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
          { next: { revalidate: 86400 } }
        );
        if (oembedRes.ok) {
          const oembed = (await oembedRes.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
          if (oembed.title) title = oembed.title;
          if (oembed.author_name) artist = oembed.author_name;
          if (oembed.thumbnail_url) coverUrl = oembed.thumbnail_url;
        }
      } catch {
        // Fallback to defaults
      }

      const item: SearchResultItem = {
        id: `yt-${ytId}`,
        title,
        artist,
        coverUrl,
        durationSec: 0,
        youtubeId: ytId,
        source: "youtube"
      };
      return NextResponse.json(
        { results: [item] },
        { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
      );
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

