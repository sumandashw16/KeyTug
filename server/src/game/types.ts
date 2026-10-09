export type Team = 1 | 2;
export type Status = 'lobby' | 'countdown' | 'playing' | 'paused' | 'finished';
export type EndReason = 'lead' | 'time' | null;

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
  timeLimitMs: number; // 0 = no limit
  remainingMs: number; // time left while the clock is not running
  deadline: number | null; // server time the round ends (only while running)
  endReason: EndReason;
  text: string;
  goAt: number | null;
  clockStart: number | null;
  pausedAt: number | null;
  endedAt: number | null;
  winner: Team | null; // null + finished = draw
  finalDifference: number;
  botSeq: number;
  countdownTimer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
  botTimer: NodeJS.Timeout | null;
  timeTimer: NodeJS.Timeout | null;
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