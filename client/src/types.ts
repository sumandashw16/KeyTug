export type Team = 1 | 2;
export type Status = 'lobby' | 'countdown' | 'playing' | 'paused' | 'finished';
export type EndReason = 'lead' | 'time' | null;

export interface ChatMessage {
  id: number;
  kind: 'user' | 'system';
  name: string;
  team: Team | null;
  playerId: string | null;
  text: string;
  at: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  team: Team | null;
  weight: number;
  connected: boolean;
  progress: number;
  errors: number;
  isBot: boolean;
  botWpm: number;
  botAccuracy: number;
}

export interface RoomState {
  roomId: string;
  you: string;
  hostId: string | null;
  round: number;
  status: Status;
  pausedFrom: 'countdown' | 'playing' | null;
  players: PublicPlayer[];
  winningDifference: number;
  timeLimitMs: number;
  remainingMs: number;
  deadline: number | null;
  endReason: EndReason;
  goAt: number | null;
  clockStart: number | null;
  endedAt: number | null;
  winner: Team | null;
  finalDifference: number;
  serverNow: number;
}