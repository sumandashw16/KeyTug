export type Slot = 1 | 2;
export type Status = 'lobby' | 'countdown' | 'playing' | 'paused' | 'finished';

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