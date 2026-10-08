export type Team = 1 | 2;
export type Status = 'lobby' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface PublicPlayer {
  id: string;
  name: string;
  team: Team | null;
  weight: number;
  connected: boolean;
  progress: number;
  errors: number;
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
  goAt: number | null;
  clockStart: number | null;
  endedAt: number | null;
  winner: Team | null;
  finalDifference: number;
  serverNow: number;
}