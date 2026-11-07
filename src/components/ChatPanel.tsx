"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import type { ChatMessage, Participant } from "@/lib/types";

interface ChatPanelProps {
  participants: Participant[];
  messages: ChatMessage[];
  selfId: string;
  typingNames: string[];
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onReact: (emoji: string) => void;
}

const REACTIONS = ["❤️", "🔥", "🌙", "☕", "✨", "🥺"];

export function ChatPanel({ participants, messages, selfId, typingNames, onSend, onTyping, onReact }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);

  // Scroll the list itself — never the page.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length, typingNames.length]);

  const change = (value: string) => {
    setDraft(value);
    onTyping(value.trim().length > 0);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => onTyping(false), 1800);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    onTyping(false);
  };

  return (
    <div className="glass flex h-full min-h-0 w-full flex-col p-4">
      <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-3">
        {participants.map((p) => (
          <span key={p.socketId} className="well flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-xs font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-sm" style={{ backgroundColor: `${p.color}44` }}>
              {p.emoji}
            </span>
            <span className="max-w-[110px] truncate">{p.name}</span>
            {p.socketId === selfId && <span className="font-semibold text-[var(--ink-faint)]">you</span>}
            {p.inCall &&
              (p.muted ? <MicOff className="h-3.5 w-3.5 text-[var(--rose)]" /> : <Mic className="h-3.5 w-3.5 text-[var(--sage)]" />)}
          </span>
        ))}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-sm font-semibold text-[var(--ink-faint)]">Say hi 👋</p>
        )}

        {messages.map((msg) => {
          if (msg.type === "system") {
            return (
              <p key={msg.id} className="mx-auto max-w-[92%] rounded-full px-3 py-1 text-center text-xs text-[var(--ink-faint)]">
                {msg.text}
              </p>
            );
          }
          const mine = msg.senderSocketId === selfId;
          return (
            <div key={msg.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && (
                <span className="mb-0.5 px-2 text-[11px] font-bold" style={{ color: msg.senderColor }}>
                  {msg.senderEmoji} {msg.senderName}
                </span>
              )}
              <p
                className={`max-w-[86%] break-words rounded-3xl px-4 py-2 text-sm leading-snug ${
                  mine
                    ? "rounded-br-lg bg-gradient-to-br from-[var(--amber)] to-[var(--rose)] font-semibold text-[#2b1416]"
                    : "well rounded-bl-lg text-[var(--ink)]"
                }`}
              >
                {msg.text}
              </p>
            </div>
          );
        })}

        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 px-2 text-xs text-[var(--ink-faint)]">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-[var(--ink-soft)] animate-dot" style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </span>
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-1 rounded-full border border-[var(--line)] bg-white/5 px-2 py-1">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            aria-label={`Send ${emoji}`}
            className="rounded-full px-2 py-1 text-lg transition hover:-translate-y-0.5 hover:scale-125 active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => change(e.target.value)}
          placeholder="Say something sweet…"
          maxLength={500}
          className="field h-11 rounded-full px-4 text-sm font-semibold"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

