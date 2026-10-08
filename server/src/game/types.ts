export type Team = 1 | 2;
export type Status = 'lobby' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface Player {
  id: string; // public id
  token: string; // private, used to rejoin
  socketId: string | null;
  connected: boolean; // bots are always "connected"
  name: string;
  team: Team | null; // null = spectator
  weight: number; // score multiplier per correct character
  progress: number; // correct characters
  errors: number;
  isBot: boolean;
  botWpm: number;
  botAccuracy: number; // percent
  nextAt: number; // bot only: server time of next keystroke
}

export interface Room {
  id: string;
  round: number;
  status: Status;
  pausedFrom: 'countdown' | 'playing' | null;
  players: Player[]; // join order
  winningDifference: number; // in weighted points
  text: string;
  goAt: number | null;
  clockStart: number | null;
  pausedAt: number | null;
  endedAt: number | null;
  winner: Team | null;
  finalDifference: number;
  botSeq: number;
  countdownTimer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
  botTimer: NodeJS.Timeout | null;
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
  you: string; // your player id
  hostId: string | null;
  round: number;
  status: Status;
  pausedFrom: 'countdown' | 'playing' | null;
  players: PublicPlayer[];
  winningDifference: number;
  goAt: number | null;
  clockStart: number | null;
  endedAt: number | null;
  winner: Team | null;
  finalDifference: number;
  serverNow: number;
}