import type { Identity } from "./types";

export interface AvatarItem {
  id: string;
  url: string;
  noun: string;
  color: string;
}

export const AVATAR_DATABASE: AvatarItem[] = [
  { id: "avatar-01", url: "/avatars/avatar-01.png", noun: "Beanie", color: "#ff9f43" },
  { id: "avatar-02", url: "/avatars/avatar-02.png", noun: "Skater", color: "#a55eea" },
  { id: "avatar-03", url: "/avatars/avatar-03.png", noun: "Dreamer", color: "#fed330" },
  { id: "avatar-04", url: "/avatars/avatar-04.png", noun: "Barista", color: "#26de81" },
  { id: "avatar-05", url: "/avatars/avatar-05.png", noun: "Cat", color: "#fc5c65" },
  { id: "avatar-06", url: "/avatars/avatar-06.png", noun: "Pup", color: "#fd9644" },
  { id: "avatar-07", url: "/avatars/avatar-07.png", noun: "Curly", color: "#778ca3" },
  { id: "avatar-08", url: "/avatars/avatar-08.png", noun: "Melody", color: "#8854d0" },
  { id: "avatar-09", url: "/avatars/avatar-09.png", noun: "Rebel", color: "#eb3b5a" },
  { id: "avatar-10", url: "/avatars/avatar-10.png", noun: "Lofi Girl", color: "#45aaf2" },
  { id: "avatar-11", url: "/avatars/avatar-11.png", noun: "Panda", color: "#2bcbba" },
  { id: "avatar-12", url: "/avatars/avatar-12.png", noun: "Ghost", color: "#fa8231" },
  { id: "avatar-13", url: "/avatars/avatar-13.png", noun: "Alien", color: "#4b6584" },
  { id: "avatar-14", url: "/avatars/avatar-14.png", noun: "Frog", color: "#20bf6b" },
  { id: "avatar-15", url: "/avatars/avatar-15.png", noun: "Stargazer", color: "#a55eea" },
  { id: "avatar-16", url: "/avatars/avatar-16.png", noun: "Fox", color: "#26de81" },
  { id: "avatar-17", url: "/avatars/avatar-17.png", noun: "Bubblegum", color: "#fd79a8" },
  { id: "avatar-18", url: "/avatars/avatar-18.png", noun: "Robot", color: "#0984e3" },
  { id: "avatar-19", url: "/avatars/avatar-19.png", noun: "Penguin", color: "#6c5ce7" },
  { id: "avatar-20", url: "/avatars/avatar-20.png", noun: "Mellow", color: "#e17055" },
  { id: "avatar-21", url: "/avatars/avatar-21.png", noun: "Bunny", color: "#74b9ff" },
  { id: "avatar-22", url: "/avatars/avatar-22.png", noun: "Tabby", color: "#ffeaa7" },
  { id: "avatar-23", url: "/avatars/avatar-23.png", noun: "Raccoon", color: "#a29bfe" },
  { id: "avatar-24", url: "/avatars/avatar-24.png", noun: "Kitsune", color: "#00cec9" },
  { id: "avatar-25", url: "/avatars/avatar-25.png", noun: "Starboy", color: "#ff9f43" },
  { id: "avatar-26", url: "/avatars/avatar-26.png", noun: "Heartbeat", color: "#ff7675" },
  { id: "avatar-27", url: "/avatars/avatar-27.png", noun: "Cosmo", color: "#0984e3" },
  { id: "avatar-28", url: "/avatars/avatar-28.png", noun: "Blossom", color: "#55efc4" },
  { id: "avatar-29", url: "/avatars/avatar-29.png", noun: "Flash", color: "#a29bfe" },
  { id: "avatar-30", url: "/avatars/avatar-30.png", noun: "Luna", color: "#2d3436" },
  { id: "avatar-31", url: "/avatars/avatar-31.png", noun: "Zen", color: "#fab1a0" },
  { id: "avatar-32", url: "/avatars/avatar-32.png", noun: "Nova", color: "#d63031" }
];

const EMOJI_TO_AVATAR: Record<string, string> = {
  "🦊": "/avatars/avatar-16.png",
  "🐈‍⬛": "/avatars/avatar-05.png",
  "🐱": "/avatars/avatar-05.png",
  "🐼": "/avatars/avatar-11.png",
  "🐸": "/avatars/avatar-14.png",
  "🐇": "/avatars/avatar-21.png",
  "🦦": "/avatars/avatar-06.png",
  "🦉": "/avatars/avatar-30.png",
  "🧸": "/avatars/avatar-20.png",
  "🐨": "/avatars/avatar-07.png",
  "🦆": "/avatars/avatar-28.png",
  "🦔": "/avatars/avatar-23.png",
  "🐶": "/avatars/avatar-06.png",
  "🤖": "/avatars/avatar-18.png",
  "👻": "/avatars/avatar-12.png",
  "👽": "/avatars/avatar-13.png",
  "🐧": "/avatars/avatar-19.png"
};

const ADJECTIVES = [
  "Sleepy",
  "Velvet",
  "Midnight",
  "Cozy",
  "Mellow",
  "Rainy",
  "Golden",
  "Dreamy",
  "Dusty",
  "Lunar",
  "Chill",
  "Groovy",
  "Sunny",
  "Echo",
  "Warm"
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Resolves an avatar string to a valid avatar image URL, handling legacy emojis and path formats. */
export function resolveAvatarUrl(val?: string, name?: string): string {
  if (!val) {
    if (name) return identityFor(name).emoji;
    return AVATAR_DATABASE[0].url;
  }
  if (val.startsWith("/") || val.startsWith("http")) return val;
  if (val.startsWith("avatar-")) return `/avatars/${val}`;
  if (EMOJI_TO_AVATAR[val]) return EMOJI_TO_AVATAR[val];
  // Stable fallback for other strings
  const h = hash(val);
  return AVATAR_DATABASE[h % AVATAR_DATABASE.length].url;
}

/** Stable avatar derived from the user's chosen name. */
export function identityFor(name: string): Identity {
  const h = hash(name.trim().toLowerCase());
  const avatar = AVATAR_DATABASE[h % AVATAR_DATABASE.length];
  return {
    name,
    emoji: avatar.url,
    color: avatar.color
  };
}

/** Randomize an identity with a fresh name and randomized avatar from the database. */
export function randomIdentity(): Identity {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const avatar = AVATAR_DATABASE[Math.floor(Math.random() * AVATAR_DATABASE.length)];
  return {
    name: `${adjective} ${avatar.noun}`,
    emoji: avatar.url,
    color: avatar.color
  };
}

/** Pick a random avatar from the database, optionally avoiding the current one. */
export function randomAvatar(excludeUrl?: string): AvatarItem {
  const pool = excludeUrl ? AVATAR_DATABASE.filter((a) => a.url !== excludeUrl) : AVATAR_DATABASE;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Cycle to the next avatar in the database. */
export function nextAvatar(currentUrl?: string): AvatarItem {
  const currentIndex = AVATAR_DATABASE.findIndex((a) => a.url === currentUrl);
  if (currentIndex === -1) {
    return AVATAR_DATABASE[Math.floor(Math.random() * AVATAR_DATABASE.length)];
  }
  return AVATAR_DATABASE[(currentIndex + 1) % AVATAR_DATABASE.length];
}

export const EMPTY_IDENTITY: Identity = {
  name: "",
  emoji: AVATAR_DATABASE[0].url,
  color: AVATAR_DATABASE[0].color
};

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

const CLIENT_ID_KEY = "rooftop:client_id";

/** Persistent per-browser identifier so reconnects/refreshes replace ghost sockets instead of duplicating the user. */
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
