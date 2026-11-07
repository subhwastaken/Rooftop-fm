"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { formatClock } from "@/lib/identity";
import type { CallStatus } from "@/lib/useCall";
import type { CallIncoming } from "@/lib/types";

interface CallButtonProps {
  status: CallStatus;
  canCall: boolean;
  connectedAt: number | null;
  muted: boolean;
  onStart: () => void;
  onCancel: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
}

function CallTimer({ since }: { since: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{since ? formatClock((Date.now() - since) / 1000) : "0:00"}</>;
}

/** Top-bar call control: ring → waiting → live call with mute and hang up. */
export function CallButton({ status, canCall, connectedAt, muted, onStart, onCancel, onHangup, onToggleMute }: CallButtonProps) {
  if (status === "idle") {
    return (
      <button
        onClick={onStart}
        disabled={!canCall}
        title={canCall ? "Ring them for a voice call" : "Calling unlocks when someone else is here"}
        className="btn-soft flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold"
      >
        <Phone className="h-4 w-4 text-[var(--sage)]" />
        <span className="hidden sm:inline">Call</span>
      </button>
    );
  }

  if (status === "calling" || status === "connecting") {
    return (
      <div className="flex h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-white/10 pl-4 pr-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--amber)] animate-ripple" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
        </span>
        <span className="text-sm font-bold">{status === "calling" ? "Ringing…" : "Connecting…"}</span>
        <button
          onClick={onCancel}
          aria-label="Cancel call"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center gap-1.5 rounded-full border border-[var(--sage)]/40 bg-[var(--sage)]/15 pl-4 pr-1.5">
      <span className="h-2 w-2 rounded-full bg-[var(--sage)]" />
      <span className="mr-1 text-sm font-bold tabular-nums">
        <CallTimer since={connectedAt} />
      </span>
      <button
        onClick={onToggleMute}
        aria-label={muted ? "Unmute microphone" : "Mute microphone"}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          muted ? "bg-[var(--rose)]/30 text-[var(--rose)]" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
      <button
        onClick={onHangup}
        aria-label="Hang up"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--rose)] text-[#2b1416] transition hover:brightness-110"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
}

interface IncomingCallProps {
  incoming: CallIncoming | null;
  onAccept: () => void;
  onDecline: () => void;
}

/** Appears when the other person rings. Nothing connects until you accept. */
export function IncomingCall({ incoming, onAccept, onDecline }: IncomingCallProps) {
  if (!incoming) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      <div role="alertdialog" aria-label={`${incoming.fromName} is calling`} className="glass-strong pointer-events-auto flex w-full max-w-sm items-center gap-4 p-4 animate-rise-in">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[var(--sage)]/50 animate-ripple" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line)] bg-white/10 text-3xl">
            {incoming.fromEmoji}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{incoming.fromName}</p>
          <p className="text-xs text-[var(--ink-soft)]">wants to talk while you listen</p>
        </div>
        <button
          onClick={onDecline}
          aria-label="Decline call"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--rose)] text-[#2b1416] transition hover:scale-105 active:scale-95"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
        <button
          onClick={onAccept}
          aria-label="Accept call"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sage)] text-[#12281a] transition hover:scale-105 active:scale-95"
        >
          <Phone className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

