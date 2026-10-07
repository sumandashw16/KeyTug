export type Slot = 1 | 2;
export type Status = 'lobby' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface Player {
  token: string;
  socketId: string | null;
  connected: boolean;
  progress: number; // correct characters
  errors: number; // wrong key presses
  wantsRematch: boolean;
}

export interface Room {
  id: string;
  round: number;
  status: Status;
  pausedFrom: 'countdown' | 'playing' | null;
  players: Record<Slot, Player | null>;
  winningDifference: number;
  p1Advantage: number; // P2 advantage = 100 - p1Advantage
  text: string;
  goAt: number | null; // server time when typing is allowed
  clockStart: number | null; // base for WPM / plausibility (excludes paused time)
  pausedAt: number | null;
  endedAt: number | null;
  winner: Slot | null;
  finalDifference: number;
  countdownTimer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
}

export interface PublicPlayer {
  connected: boolean;
  progress: number;
  errors: number;
  wantsRematch: boolean;
}

export interface RoomState {
  roomId: string;
  you: Slot;
  round: number;
  status: Status;
  pausedFrom: 'countdown' | 'playing' | null;
  players: Record<Slot, PublicPlayer | null>;
  winningDifference: number;
  p1Advantage: number;
  goAt: number | null;
  clockStart: number | null;
  endedAt: number | null;
  winner: Slot | null;
  finalDifference: number;
  serverNow: number;
}