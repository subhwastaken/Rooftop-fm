export type TimeOfDay = "day" | "sunset" | "night";

export interface Identity {
  name: string;
  emoji: string;
  color: string;
}

export interface TrackItem {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  durationSec: number;
  addedBy: string;
}

export type TrackInput = Omit<TrackItem, "id" | "addedBy">;

export interface SearchResultItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  durationSec: number;
  youtubeId?: string;
  source: "catalog" | "youtube" | "spotify-link";
}

export interface Participant {
  socketId: string;
  name: string;
  emoji: string;
  color: string;
  joinedAt: number;
  inCall: boolean;
  muted: boolean;
}

export interface ChatMessage {
  id: string;
  type: "user" | "system";
  senderSocketId?: string;
  senderName: string;
  senderEmoji: string;
  senderColor: string;
  text: string;
  createdAt: number;
}

export interface PlaybackState {
  currentTrack: TrackItem | null;
  isPlaying: boolean;
  positionSec: number;
  updatedAt: number;
  lastActionBy: string | null;
}

export interface TogetherInfo {
  ms: number;
  active: boolean;
}

export interface RoomSnapshot {
  code: string;
  name: string;
  participants: Participant[];
  queue: TrackItem[];
  playback: PlaybackState;
  messages: ChatMessage[];
  together: TogetherInfo;
}

export interface PresencePayload {
  participants: Participant[];
  together: TogetherInfo;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xPercent: number;
}

export interface LyricLine {
  timeSec: number;
  text: string;
}

export interface CallIncoming {
  fromId: string;
  fromName: string;
  fromEmoji: string;
}
