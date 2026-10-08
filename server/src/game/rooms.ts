import { randomUUID } from 'crypto';
import { Player, Room, RoomState, Team } from './types';

export const rooms = new Map<string, Room>();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function makeCode(): string {
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createPlayer(socketId: string, name: string, team: Team | null): Player {
  return {
    id: randomUUID().slice(0, 8),
    token: randomUUID(),
    socketId,
    connected: true,
    name,
    team,
    weight: 1,
    progress: 0,
    errors: 0,
  };
}

export function createRoom(): Room {
  const room: Room = {
    id: makeCode(),
    round: 0,
    status: 'lobby',
    pausedFrom: null,
    players: [],
    winningDifference: 100,
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

/** Host = first connected player in join order (so hosting passes on automatically). */
export const hostOf = (room: Room): Player | null => room.players.find((p) => p.connected) ?? null;

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
  for (const p of room.players) {
    p.progress = 0;
    p.errors = 0;
  }
}

export function toState(room: Room, you: string): RoomState {
  return {
    roomId: room.id,
    you,
    hostId: hostOf(room)?.id ?? null,
    round: room.round,
    status: room.status,
    pausedFrom: room.pausedFrom,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      weight: p.weight,
      connected: p.connected,
      progress: p.progress,
      errors: p.errors,
    })),
    winningDifference: room.winningDifference,
    goAt: room.goAt,
    clockStart: room.clockStart,
    endedAt: room.endedAt,
    winner: room.winner,
    finalDifference: room.finalDifference,
    serverNow: Date.now(),
  };
}