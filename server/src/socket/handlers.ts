import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { checkWinner, clampWeight, clampWinningDifference } from '../game/logic';
import { createPlayer, createRoom, hostOf, resetToLobby, rooms, toState } from '../game/rooms';
import { generateText } from '../game/text';
import { Player, Room, Team } from '../game/types';

const COUNTDOWN_MS = 3000;
const MAX_CPS = 25; // plausibility cap per player: 25 chars/sec
const BURST_ALLOWANCE = 40;
const EMPTY_ROOM_TTL_MS = 2 * 60 * 1000;
const MAX_PLAYERS = 16;
const TEAMS: Team[] = [1, 2];

const reply = (ack: unknown, payload: unknown) => {
  if (typeof ack === 'function') (ack as (p: unknown) => void)(payload);
};

const cleanName = (raw: unknown, fallback: string) => {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return s || fallback;
};

export function registerSocketHandlers(io: Server): void {
  // ---------- helpers ----------
  const broadcast = (room: Room) => {
    for (const p of room.players) {
      if (p.connected && p.socketId) io.to(p.socketId).emit('room:state', toState(room, p.id));
    }
  };

  const clearCountdown = (room: Room) => {
    if (room.countdownTimer) clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  };

  const destroyRoom = (room: Room) => {
    clearCountdown(room);
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    rooms.delete(room.id);
  };

  const updateCleanup = (room: Room) => {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
    if (!room.players.some((p) => p.connected)) {
      room.cleanupTimer = setTimeout(() => destroyRoom(room), EMPTY_ROOM_TTL_MS);
    }
  };

  /** Both teams need at least one connected player. */
  const teamsReady = (room: Room) =>
    TEAMS.every((t) => room.players.some((p) => p.team === t && p.connected));

  const smallerTeam = (room: Room): Team => {
    const a = room.players.filter((p) => p.team === 1).length;
    const b = room.players.filter((p) => p.team === 2).length;
    return b < a ? 2 : 1;
  };

  const isHost = (room: Room, player: Player) => hostOf(room)?.id === player.id;

  const findBySocket = (socket: Socket): { room: Room; player: Player } | null => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return null;
    const room = rooms.get(roomId);
    if (!room) return null;
    const player = room.players.find((p) => p.socketId === socket.id);
    return player ? { room, player } : null;
  };

  const attach = (socket: Socket, room: Room, player: Player) => {
    player.socketId = socket.id;
    player.connected = true;
    socket.data.roomId = room.id;
    socket.join(room.id);
    updateCleanup(room);
  };

  const markDisconnected = (room: Room, player: Player) => {
    player.connected = false;
    player.socketId = null;
    // Game continues unless a whole team is gone.
    if ((room.status === 'countdown' || room.status === 'playing') && !teamsReady(room)) {
      clearCountdown(room);
      room.pausedFrom = room.status;
      room.status = 'paused';
      room.pausedAt = Date.now();
    }
    updateCleanup(room);
    broadcast(room);
  };

  const beginCountdown = (room: Room) => {
    clearCountdown(room);
    room.status = 'countdown';
    room.goAt = Date.now() + COUNTDOWN_MS;
    room.countdownTimer = setTimeout(() => {
      room.countdownTimer = null;
      if (room.status === 'countdown') {
        room.status = 'playing';
        broadcast(room);
      }
    }, COUNTDOWN_MS);
  };

  const startNewRound = (room: Room) => {
    room.round += 1;
    for (const p of room.players) {
      p.progress = 0;
      p.errors = 0;
    }
    room.text = generateText();
    room.winner = null;
    room.finalDifference = 0;
    room.endedAt = null;
    room.pausedAt = null;
    room.pausedFrom = null;
    beginCountdown(room);
    room.clockStart = room.goAt;
    io.to(room.id).emit('game:text', room.text); // text first, then state
    broadcast(room);
  };

  const resumeRound = (room: Room) => {
    const from = room.pausedFrom;
    const pausedAt = room.pausedAt;
    beginCountdown(room);
    if (from === 'playing' && room.clockStart !== null && pausedAt !== null && room.goAt !== null) {
      room.clockStart += room.goAt - pausedAt; // exclude paused time from WPM
    } else {
      room.clockStart = room.goAt;
    }
    room.pausedFrom = null;
    room.pausedAt = null;
    broadcast(room);
  };

  const dropDisconnected = (room: Room) => {
    room.players = room.players.filter((p) => p.connected);
  };

  const leaveRoom = (socket: Socket) => {
    const found = findBySocket(socket);
    if (!found) return;
    const { room, player } = found;
    socket.leave(room.id);
    socket.data.roomId = undefined;
    if (room.status === 'lobby') {
      room.players = room.players.filter((p) => p !== player);
      if (room.players.length === 0) return destroyRoom(room);
      updateCleanup(room);
      broadcast(room);
    } else {
      player.token = randomUUID(); // cannot rejoin after deliberately leaving
      markDisconnected(room, player);
    }
  };

  // ---------- connection ----------
  io.on('connection', (socket) => {
    socket.on('time:sync', (ack: unknown) => reply(ack, Date.now()));

    socket.on('room:create', (data: { name?: string }, ack: unknown) => {
      leaveRoom(socket);
      const room = createRoom();
      const player = createPlayer(socket.id, cleanName(data?.name, 'Player 1'), 1);
      room.players.push(player);
      attach(socket, room, player);
      reply(ack, { ok: true, roomId: room.id, token: player.token });
      broadcast(room);
    });

    socket.on('room:join', (data: { roomId?: string; name?: string }, ack: unknown) => {
      const code = String(data?.roomId ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return reply(ack, { ok: false, error: 'Room not found' });
      if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'Game already in progress' });
      if (room.players.length >= MAX_PLAYERS) return reply(ack, { ok: false, error: 'Room is full' });
      leaveRoom(socket);
      const player = createPlayer(
        socket.id,
        cleanName(data?.name, `Player ${room.players.length + 1}`),
        smallerTeam(room)
      );
      room.players.push(player);
      attach(socket, room, player);
      reply(ack, { ok: true, roomId: room.id, token: player.token });
      broadcast(room);
    });

    socket.on('room:rejoin', (data: { roomId?: string; token?: string }, ack: unknown) => {
      const room = rooms.get(String(data?.roomId ?? ''));
      if (!room) return reply(ack, { ok: false });
      const player = room.players.find((p) => p.token === data?.token);
      if (!player) return reply(ack, { ok: false });
      attach(socket, room, player);
      if (room.text && room.status !== 'lobby') socket.emit('game:text', room.text);
      reply(ack, { ok: true, roomId: room.id });
      if (room.status === 'paused' && teamsReady(room)) resumeRound(room);
      else broadcast(room);
    });

    socket.on('room:leave', () => leaveRoom(socket));

    socket.on('room:settings', (data: { winningDifference?: number }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      if (typeof data?.winningDifference === 'number' && Number.isFinite(data.winningDifference)) {
        room.winningDifference = clampWinningDifference(data.winningDifference);
      }
      broadcast(room);
    });

    socket.on('room:team', (data: { team?: unknown }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (room.status !== 'lobby') return;
      const t = data?.team;
      if (t === 1 || t === 2 || t === null) {
        player.team = t;
        broadcast(room);
      }
    });

    socket.on('room:weight', (data: { playerId?: string; weight?: number }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      const target = room.players.find((p) => p.id === data?.playerId);
      const w = Number(data?.weight);
      if (!target || !Number.isFinite(w)) return;
      target.weight = clampWeight(w);
      broadcast(room);
    });

    socket.on('game:start', () => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      if (!teamsReady(room)) return;
      dropDisconnected(room);
      startNewRound(room);
    });

    socket.on('game:progress', (data: { progress?: unknown; errors?: unknown }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (player.team === null) return; // spectators cannot score
      const now = Date.now();
      // tolerate tiny clock error right at "GO"
      if (room.status === 'countdown' && room.goAt !== null && now >= room.goAt - 250) {
        clearCountdown(room);
        room.status = 'playing';
      }
      if (room.status !== 'playing' || room.clockStart === null) return;

      const p = Number(data?.progress);
      const e = Number(data?.errors);
      if (!Number.isInteger(p) || !Number.isInteger(e)) return;
      if (p < player.progress || e < player.errors || p > room.text.length || e > 1_000_000) return;
      const elapsedSec = Math.max(0, now - room.clockStart) / 1000;
      if (p > BURST_ALLOWANCE + MAX_CPS * elapsedSec) return; // basic plausibility check

      player.progress = p;
      player.errors = e;

      // Server decides the winner.
      const result = checkWinner(room.players, room.winningDifference);
      if (result.winner) {
        clearCountdown(room);
        room.status = 'finished';
        room.winner = result.winner;
        room.finalDifference = Math.round(Math.abs(result.difference) * 10) / 10;
        room.endedAt = now;
      }
      broadcast(room);
    });

    // Host starts another round with the same teams and weights.
    socket.on('game:again', () => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'finished') return;
      if (!teamsReady(room)) return;
      dropDisconnected(room);
      startNewRound(room);
    });

    socket.on('room:lobby', () => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player)) return;
      if (room.status !== 'finished' && room.status !== 'paused') return;
      dropDisconnected(room);
      resetToLobby(room);
      broadcast(room);
    });

    socket.on('disconnect', () => {
      const found = findBySocket(socket);
      if (!found) return; // already replaced by a newer socket / left deliberately
      markDisconnected(found.room, found.player);
    });
  });
}