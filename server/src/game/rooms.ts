import { randomUUID } from 'crypto';
import { Player, PublicPlayer, Room, RoomState, Slot } from './types';

export const rooms = new Map<string, Room>();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const SLOTS: Slot[] = [1, 2];

function makeCode(): string {
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createPlayer(socketId: string): Player {
  return { token: randomUUID(), socketId, connected: true, progress: 0, errors: 0, wantsRematch: false };
}

export function createRoom(): Room {
  const room: Room = {
    id: makeCode(),
    round: 0,
    status: 'lobby',
    pausedFrom: null,
    players: { 1: null, 2: null },
    winningDifference: 100,
    p1Advantage: 50,
    text: '',
    goAt: null,
    clockStart: null,
    pausedAt: null,
    endedAt: null,
    winner: null,
    finalDifference: 0,
    countdownTimer: null,
    cleanupTimer: null,
  };
  rooms.set(room.id, room);
  return room;
}

export function resetToLobby(room: Room): void {
  if (room.countdownTimer) clearTimeout(room.countdownTimer);
  room.countdownTimer = null;
  room.status = 'lobby';
  room.pausedFrom = null;
  room.text = '';
  room.goAt = null;
  room.clockStart = null;
  room.pausedAt = null;
  room.endedAt = null;
  room.winner = null;
  room.finalDifference = 0;
  for (const s of SLOTS) {
    const p = room.players[s];
    if (p) {
      p.progress = 0;
      p.errors = 0;
      p.wantsRematch = false;
    }
  }
}

const pub = (p: Player | null): PublicPlayer | null =>
  p && { connected: p.connected, progress: p.progress, errors: p.errors, wantsRematch: p.wantsRematch };

export function toState(room: Room, you: Slot): RoomState {
  return {
    roomId: room.id,
    you,
    round: room.round,
    status: room.status,
    pausedFrom: room.pausedFrom,
    players: { 1: pub(room.players[1]), 2: pub(room.players[2]) },
    winningDifference: room.winningDifference,
    p1Advantage: room.p1Advantage,
    goAt: room.goAt,
    clockStart: room.clockStart,
    endedAt: room.endedAt,
    winner: room.winner,
    finalDifference: room.finalDifference,
    serverNow: Date.now(),
  };
}