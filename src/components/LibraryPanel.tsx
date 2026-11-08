"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ListMusic, Loader2, Mic2, Music2, Play, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { formatDuration } from "@/lib/identity";
import { activeLyricIndex, type LyricsState } from "@/lib/useLyrics";
import type { SearchResultItem, TrackInput, TrackItem } from "@/lib/types";

type Tab = "search" | "queue" | "lyrics";

interface LibraryPanelProps {
  queue: TrackItem[];
  currentSec: number;
  lyrics: LyricsState;
  hasTrack: boolean;
  onPlayNow: (track: TrackInput) => void;
  onAddToQueue: (track: TrackInput) => void;
  onPlayFromQueue: (id: string) => void;
  onRemoveFromQueue: (id: string) => void;
  onSeek: (sec: number) => void;
}

const MOODS = ["lofi beats", "acoustic chill", "late night drive", "bollywood unwind"];

// In-memory client cache so previously resolved songs load with 0ms delay
const clientResolvedCache = new Map<string, { youtubeId: string; durationSec: number }>();

export function LibraryPanel({
  queue,
  currentSec,
  lyrics,
  hasTrack,
  onPlayNow,
  onAddToQueue,
  onPlayFromQueue,
  onRemoveFromQueue,
  onSeek
}: LibraryPanelProps) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const lyricsBoxRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const activeIdx = activeLyricIndex(lyrics.synced, currentSec);

  // Keep the current lyric centred inside the lyrics box (without moving the page).
  useEffect(() => {
    if (tab !== "lyrics" || activeIdx < 0) return;
    const box = lyricsBoxRef.current;
    const line = box?.querySelector<HTMLElement>(`[data-line="${activeIdx}"]`);
    if (box && line) {
      box.scrollTo({ top: line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2, behavior: "smooth" });
    }
  }, [activeIdx, tab]);

  const executeSearch = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim();
    abortRef.current?.abort();

    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal
      });
      const data = (await res.json()) as { results?: SearchResultItem[] };
      if (!controller.signal.aborted) {
        const list = data.results ?? [];
        setResults(list);
        setSearched(true);
        setSearching(false);

        // Pre-resolve the top 1-2 items in the background so tapping "Play" is instantaneous
        for (const it of list.slice(0, 2)) {
          if (!it.youtubeId && it.title) {
            const cacheKey = `${it.artist.toLowerCase()}::${it.title.toLowerCase()}`;
            if (!clientResolvedCache.has(cacheKey)) {
              fetch(
                `/api/resolve?title=${encodeURIComponent(it.title)}&artist=${encodeURIComponent(it.artist)}&duration=${it.durationSec}`
              )
                .then((r) => (r.ok ? r.json() : null))
                .then((resolved) => {
                  if (resolved?.youtubeId) {
                    clientResolvedCache.set(cacheKey, resolved);
                  }
                })
                .catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setResults([]);
        setSearched(true);
        setSearching(false);
      }
    }
  }, []);

  // Stream results automatically as the user types
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }

    setSearching(true);
    const isLink = /^https?:\/\//i.test(trimmed);
    const delay = isLink ? 90 : trimmed.length >= 2 ? 220 : 380;

    debounceRef.current = window.setTimeout(() => {
      void executeSearch(trimmed);
    }, delay);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, executeSearch]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const clearSearch = () => {
    abortRef.current?.abort();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setQuery("");
    setResults([]);
    setSearching(false);
    setSearched(false);
  };

  const send = async (item: SearchResultItem, mode: "play" | "queue") => {
    const key = `${mode}-${item.id}`;
    setBusyKey(key);
    try {
      let youtubeId = item.youtubeId;
      let durationSec = item.durationSec;

      if (!youtubeId) {
        const cacheKey = `${item.artist.toLowerCase()}::${item.title.toLowerCase()}`;
        const cached = clientResolvedCache.get(cacheKey);
        if (cached?.youtubeId) {
          youtubeId = cached.youtubeId;
          durationSec = cached.durationSec || item.durationSec;
        } else {
          const res = await fetch(
            `/api/resolve?title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}&duration=${item.durationSec}`
          );
          if (!res.ok) return;
          const resolved = (await res.json()) as { youtubeId: string; durationSec: number };
          youtubeId = resolved.youtubeId;
          durationSec = resolved.durationSec || item.durationSec;
          if (youtubeId) {
            clientResolvedCache.set(cacheKey, { youtubeId, durationSec });
          }
        }
      }
      if (!youtubeId) return;

      const track: TrackInput = {
        youtubeId,
        title: item.title,
        artist: item.artist,
        album: item.album,
        coverUrl: item.coverUrl,
        durationSec
      };

      if (mode === "play") {
        onPlayNow(track);
      } else {
        onAddToQueue(track);
        setAdded((prev) => new Set(prev).add(item.id));
        window.setTimeout(
          () =>
            setAdded((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            }),
          1800
        );
      }
    } finally {
      setBusyKey(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "search", label: "Search", icon: <Search className="h-4 w-4" /> },
    { id: "queue", label: queue.length ? `Up next · ${queue.length}` : "Up next", icon: <ListMusic className="h-4 w-4" /> },
    { id: "lyrics", label: "Lyrics", icon: <Mic2 className="h-4 w-4" /> }
  ];

  return (
    <div className="glass flex h-full min-h-0 w-full flex-col p-4">
      <div className="well mb-3 grid grid-cols-3 gap-1 rounded-full p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-bold transition ${
              tab === t.id ? "bg-white/20 text-[var(--ink)] shadow" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "search" && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Instant Glass Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (debounceRef.current) window.clearTimeout(debounceRef.current);
              void executeSearch(query);
            }}
            className="group flex h-11 shrink-0 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.08] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md transition focus-within:border-white/38 focus-within:bg-white/[0.13] focus-within:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--amber)]" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-[var(--ink-soft)] transition group-focus-within:text-[var(--honey)]" />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, or paste a link…"
              aria-label="Search songs, artists, or paste a Spotify or YouTube link"
              className="h-full w-full bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--ink-soft)] transition hover:bg-white/20 hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Live Results Stream */}
          <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {searching && results.length === 0 && (
              <div className="space-y-2 pt-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2"
                  >
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-3/5 rounded-full bg-white/15" />
                      <div className="h-2.5 w-2/5 rounded-full bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 && !searching && (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06]">
                  <Music2 className="h-5 w-5 text-[var(--honey)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--ink-soft)]">
                  {searched
                    ? "No matches yet — try another title or artist."
                    : hasTrack
                      ? "Type anything to stream or queue next."
                      : "Start typing a song — results appear instantly."}
                </p>
                {!searched && (
                  <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                    {MOODS.map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setQuery(mood)}
                        className="btn-soft flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                      >
                        <Sparkles className="h-3 w-3 text-[var(--amber)]" />
                        <span>{mood}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {results.map((item) => {
              const justAdded = added.has(item.id);
              const isPlayingLoad = busyKey === `play-${item.id}`;
              const isQueueLoad = busyKey === `queue-${item.id}`;
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2 transition hover:border-white/22 hover:bg-white/[0.11]"
                >
                  <button
                    type="button"
                    onClick={() => void send(item, "play")}
                    disabled={busyKey !== null}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    title={`Play ${item.title} for everyone`}
                  >
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/30 shadow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                        {isPlayingLoad ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                        )}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--ink)]">{item.title}</span>
                      <span className="block truncate text-xs text-[var(--ink-faint)]">
                        {item.artist}
                        {item.durationSec > 0 ? ` · ${formatDuration(item.durationSec)}` : ""}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void send(item, "queue")}
                    disabled={busyKey !== null}
                    aria-label={`Add ${item.title} to the queue`}
                    title="Add to up next"
                    className="btn-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  >
                    {isQueueLoad ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : justAdded ? (
                      <Check className="h-3.5 w-3.5 text-[var(--sage)]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void send(item, "play")}
                    disabled={busyKey !== null}
                    aria-label={`Play ${item.title} for everyone`}
                    title="Play now for everyone"
                    className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  >
                    {isPlayingLoad ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "queue" && (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {queue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <ListMusic className="mb-2 h-8 w-8 text-[var(--ink-faint)]" />
              <p className="text-sm font-semibold text-[var(--ink-soft)]">
                Nothing queued yet. Songs you both add show up here.
              </p>
            </div>
          ) : (
            queue.map((item, index) => (
              <div key={item.id} className="well flex items-center gap-3 rounded-2xl p-2">
                <span className="w-5 text-center text-xs font-bold tabular-nums text-[var(--ink-faint)]">
                  {index + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className="truncate text-xs text-[var(--ink-faint)]">
                    {item.artist} · added by {item.addedBy}
                  </p>
                </div>
                <button
                  onClick={() => onPlayFromQueue(item.id)}
                  aria-label={`Play ${item.title} now`}
                  className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                >
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </button>
                <button
                  onClick={() => onRemoveFromQueue(item.id)}
                  aria-label={`Remove ${item.title}`}
                  className="btn-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "lyrics" && (
        <div ref={lyricsBoxRef} className="well relative min-h-0 flex-1 overflow-y-auto rounded-2xl p-4">
          {!hasTrack ? (
            <p className="py-10 text-center text-sm font-semibold text-[var(--ink-soft)]">
              Lyrics appear here once a song is playing.
            </p>
          ) : lyrics.loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--ink-soft)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding the words…
            </div>
          ) : lyrics.synced.length > 0 ? (
            <div className="space-y-3 py-[30%] text-center">
              {lyrics.synced.map((line, i) => (
                <button
                  key={`${line.timeSec}-${i}`}
                  data-line={i}
                  onClick={() => onSeek(line.timeSec)}
                  className={`block w-full font-display transition-all duration-500 ${
                    i === activeIdx
                      ? "text-xl font-semibold text-[var(--honey)]"
                      : "text-base text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
                  }`}
                >
                  {line.text}
                </button>
              ))}
            </div>
          ) : lyrics.plain ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--ink-soft)]">
              {lyrics.plain}
            </pre>
          ) : (
            <p className="py-10 text-center text-sm font-semibold text-[var(--ink-soft)]">
              No lyrics found for this one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
