"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { ArrowRight, Dices, Loader2, Plus } from "lucide-react";
import { EMPTY_IDENTITY, getClientId, identityFor, normalizeCode, randomAvatar, randomIdentity, resolveAvatarUrl } from "@/lib/identity";
import { Avatar } from "@/components/Avatar";
import type { Identity, RoomSnapshot } from "@/lib/types";

const STORAGE_KEY = "sideb:identity";

type Mode = "create" | "join";
type Preview =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "found"; name: string; count: number }
  | { state: "missing" };

interface EntryScreenProps {
  socket: Socket | null;
  connected: boolean;
  initialCode: string | null;
  notice: string | null;
  onEntered: (room: RoomSnapshot, identity: Identity) => void;
}

interface JoinAck {
  ok: boolean;
  room?: RoomSnapshot;
  error?: string;
}

export function EntryScreen({ socket, connected, initialCode, notice, onEntered }: EntryScreenProps) {
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [mode, setMode] = useState<Mode>(initialCode ? "join" : "create");
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [preview, setPreview] = useState<Preview>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Identity;
        setIdentity({
          ...parsed,
          emoji: resolveAvatarUrl(parsed.emoji, parsed.name)
        });
      }
    } catch {
      // first visit — nothing saved yet
    }
  }, []);

  // As the code is typed, peek at the channel so people know they've got the right one.
  useEffect(() => {
    if (mode !== "join" || !socket || !connected) return;
    const clean = normalizeCode(code);
    if (clean.length < 4) {
      setPreview({ state: "idle" });
      return;
    }
    setPreview({ state: "checking" });
    const timer = window.setTimeout(() => {
      socket.emit("room:check", clean, (res: { exists: boolean; name?: string; count?: number }) => {
        setPreview(res.exists ? { state: "found", name: res.name ?? "", count: res.count ?? 0 } : { state: "missing" });
      });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [code, mode, socket, connected]);

  const onNameChange = (value: string) => {
    const name = value.slice(0, 24);
    setIdentity(name.trim() ? identityFor(name) : { ...EMPTY_IDENTITY, name });
    setError(null);
  };

  const hasName = identity.name.trim().length > 0;
  const canSubmit = connected && hasName && !busy && (mode === "create" || normalizeCode(code).length >= 4);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!socket || !canSubmit) return;

    const me: Identity = { ...identity, name: identity.name.trim() };
    const payload = { userName: me.name, userEmoji: me.emoji, userColor: me.color, clientId: getClientId() };
    setBusy(true);
    setError(null);

    const handle = (res: JoinAck) => {
      setBusy(false);
      if (!res.ok || !res.room) {
        setError(res.error ?? "Something went wrong. Please try again.");
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(me));
      } catch {
        // storage is optional
      }
      onEntered(res.room, me);
    };

    if (mode === "create") socket.emit("room:create", { ...payload, roomName }, handle);
    else socket.emit("room:join", { ...payload, code: normalizeCode(code) }, handle);
  };

  return (
    <main className="relative z-10 mx-auto flex h-dvh w-full max-w-[1720px] flex-col items-center justify-center gap-4 overflow-hidden px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8 lg:px-12 xl:px-16">
      {/* Left side: intimate quote in bold, moved slightly top & right, hidden on mobile */}
      <aside className="hidden animate-rise-in md:flex md:max-w-[340px] md:self-center md:-translate-y-8 md:translate-x-5 md:flex-col md:text-left lg:max-w-[420px] lg:-translate-y-10 lg:translate-x-8 xl:max-w-[450px] xl:translate-x-12">
        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/25 py-1 pl-1.5 pr-3.5 shadow-sm backdrop-blur-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon-32x32.png" alt="Rooftop.fm logo" className="h-4 w-4 rounded-full object-cover" />
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--honey)]">Rooftop.fm</span>
        </div>
        <blockquote
          className="font-display text-2xl font-bold italic leading-tight tracking-tight text-[#fffaf3] sm:text-3xl md:text-[2rem] lg:text-[2.25rem]"
          style={{ textShadow: "0 4px 24px rgba(0, 0, 0, 0.85), 0 1px 4px rgba(0, 0, 0, 0.95)" }}
        >
          &ldquo;Distance feels quieter when the same song is playing in both rooms.&rdquo;
        </blockquote>
        <p
          className="mt-3 text-sm font-bold tracking-wide text-white/90"
          style={{ textShadow: "0 2px 14px rgba(0, 0, 0, 0.85)" }}
        >
          Two headphones · one shared needle drop.
        </p>
      </aside>

      {/* Right side: translucent liquid-glass entry pane moved further to the right */}
      <section className="glass-crystal max-h-full w-full max-w-[395px] shrink-0 overflow-y-auto p-6 animate-rise-in sm:p-7 md:ml-auto md:mr-1 lg:mr-2 xl:mr-4">
        {/* Brand */}
        <div className="mb-5 flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[var(--amber)]/35 blur-lg animate-breathe" />
            <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 shadow-lg backdrop-blur-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon-96x96.png" alt="Rooftop.fm logo" className="h-full w-full object-cover animate-vinyl" />
            </span>
          </div>
          <div>
            <h1
              className="font-display text-3xl font-semibold leading-none tracking-tight"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
            >
              Rooftop.fm
            </h1>
            <p className="mt-1.5 text-xs font-semibold text-[var(--ink-soft)]">
              Shared music & intimate moments, under the same sky.
            </p>
          </div>
        </div>

        {notice && (
          <p className="mb-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-center text-xs font-semibold text-[var(--honey)] backdrop-blur-md">
            {notice}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Name */}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
              Your name
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = randomAvatar(identity.emoji);
                  setIdentity((prev) => ({
                    ...prev,
                    emoji: next.url,
                    color: next.color
                  }));
                }}
                title="Click to randomize avatar"
                aria-label="Change profile picture"
                className="group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/60 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]"
                style={{ backgroundColor: `${identity.color}30` }}
              >
                <Avatar
                  src={identity.emoji}
                  name={identity.name}
                  size={88}
                  priority
                  className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Dices className="h-4 w-4 text-white drop-shadow" />
                </span>
              </button>
              <input
                value={identity.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="What should they call you?"
                autoComplete="nickname"
                className="field h-11 rounded-2xl px-4 text-sm font-semibold"
              />
              <button
                type="button"
                onClick={() => setIdentity(randomIdentity())}
                title="Randomize name & avatar"
                className="btn-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-white/20 bg-white/10 transition-transform active:scale-95 hover:scale-105"
              >
                <Dices className="h-4 w-4" />
              </button>
            </div>
          </label>

          {/* Mode */}
          <div
            className="grid grid-cols-2 gap-1 rounded-full border border-white/20 bg-black/20 p-1 backdrop-blur-md"
            role="tablist"
          >
            {(
              [
                ["create", "Start a channel"],
                ["join", "Join with a code"]
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`rounded-full py-2 text-xs font-bold transition sm:text-sm ${
                  mode === value
                    ? "border border-white/25 bg-white/20 text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "create" ? (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Name your channel
              </span>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value.slice(0, 40))}
                placeholder={hasName ? `${identity.name.trim()}'s channel` : "e.g. Late night drive"}
                className="field h-11 rounded-2xl px-4 text-sm font-semibold"
              />
              <span className="mt-1.5 block text-xs text-[var(--ink-soft)]">
                You&apos;ll get a code to send to your person.
              </span>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Channel code
              </span>
              <input
                value={code}
                onChange={(e) => {
                  setCode(normalizeCode(e.target.value));
                  setError(null);
                }}
                placeholder="Enter channel code"
                maxLength={14}
                autoCapitalize="characters"
                spellCheck={false}
                className="field h-[52px] rounded-2xl px-4 text-center font-display text-2xl font-bold tracking-[0.2em] placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-white/40 sm:placeholder:text-base"
              />
              <span className="mt-1.5 flex h-5 items-center justify-center gap-1.5 text-xs">
                {preview.state === "checking" && (
                  <span className="flex items-center gap-1.5 text-[var(--ink-soft)]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Looking for it…
                  </span>
                )}
                {preview.state === "found" && (
                  <span className="font-semibold text-[var(--sage)]">
                    ✓ {preview.name} · {preview.count} listening
                  </span>
                )}
                {preview.state === "missing" && (
                  <span className="text-[var(--rose)]">No channel with that code yet</span>
                )}
              </span>
            </label>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-[var(--rose)]/40 bg-[var(--rose)]/15 px-4 py-2 text-xs font-semibold text-[var(--rose)]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm sm:h-[52px] sm:text-base"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : !connected ? (
              "Connecting…"
            ) : (
              <>
                {mode === "create" ? <Plus className="h-5 w-5" /> : null}
                <span>{mode === "create" ? "Create channel" : "Join channel"}</span>
                {mode === "join" ? <ArrowRight className="h-5 w-5" /> : null}
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] font-semibold text-[var(--ink-soft)]">
          No account · No Premium · Just a code
        </p>
      </section>
    </main>
  );
}
