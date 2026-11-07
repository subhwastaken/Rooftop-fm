import type { Identity } from "./types";

const ANIMALS = [
  { noun: "Otter", emoji: "🦦" },
  { noun: "Fox", emoji: "🦊" },
  { noun: "Cat", emoji: "🐈‍⬛" },
  { noun: "Owl", emoji: "🦉" },
  { noun: "Bear", emoji: "🧸" },
  { noun: "Panda", emoji: "🐼" },
  { noun: "Rabbit", emoji: "🐇" },
  { noun: "Frog", emoji: "🐸" },
  { noun: "Koala", emoji: "🐨" },
  { noun: "Duck", emoji: "🦆" },
  { noun: "Hedgehog", emoji: "🦔" }
];

const ADJECTIVES = ["Sleepy", "Velvet", "Midnight", "Cozy", "Mellow", "Rainy", "Golden", "Dreamy", "Dusty", "Lunar"];

const COLORS = ["#ffb36b", "#ff8fa0", "#9fd8ad", "#ffd9a3", "#8fd3f4", "#f4a6c9", "#c4b5fd"];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A friendly, stable avatar derived from whatever name the person typed. */
export function identityFor(name: string): Identity {
  const h = hash(name.trim().toLowerCase());
  return {
    name,
    emoji: ANIMALS[h % ANIMALS.length].emoji,
    color: COLORS[(h >> 3) % COLORS.length]
  };
}

export function randomIdentity(): Identity {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return {
    name: `${adjective} ${animal.noun}`,
    emoji: animal.emoji,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
}

export const EMPTY_IDENTITY: Identity = { name: "", emoji: "🙂", color: COLORS[0] };

/** Always renders m:ss (or h:mm:ss) — used for clocks, including 0:00. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Track length for lists; streams without a duration read as LIVE. */
export function formatDuration(seconds: number): string {
  return seconds > 0 ? formatClock(seconds) : "LIVE";
}

export function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/^([A-Z]+)(\d+)$/, "$1-$2")
    .slice(0, 14);
}

