import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { checkWinner, clampAdvantage, clampWinningDifference } from '../game/logic';
import { createPlayer, createRoom, resetToLobby, rooms, toState } from '../game/rooms';
import { generateText } from '../game/text';
import { Player, Room, Slot } from '../game/types';

const COUNTDOWN_MS = 3000;
const MAX_CPS = 25; // plausibility cap: 25 chars/sec (~300 WPM) sustained
const BURST_ALLOWANCE = 40;
const EMPTY_ROOM_TTL_MS = 2 * 60 * 1000;
const SLOTS: Slot[] = [1, 2];

const reply = (ack: unknown, payload: unknown) => {
  if (typeof ack === 'function') (ack as (p: unknown) => void)(payload);
};

export function registerSocketHandlers(io: Server): void {
  // ---------- helpers ----------
  const broadcast = (room: Room) => {
    for (const slot of SLOTS) {
      const p = room.players[slot];
      if (p && p.connected && p.socketId) io.to(p.socketId).emit('room:state', toState(room, slot));
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
    const anyConnected = SLOTS.some((s) => room.players[s]?.connected);
    if (!anyConnected) room.cleanupTimer = setTimeout(() => destroyRoom(room), EMPTY_ROOM_TTL_MS);
  };

  const normalizeSlots = (room: Room) => {
    if (!room.players[1] && room.players[2]) {
      room.players[1] = room.players[2];
      room.players[2] = null;
    }
  };

  const findBySocket = (socket: Socket): { room: Room; player: Player } | null => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return null;
    const room = rooms.get(roomId);
    if (!room) return null;
    for (const s of SLOTS) {
      const p = room.players[s];
      if (p && p.socketId === socket.id) return { room, player: p };
    }
    return null;
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
    if (room.status === 'countdown' || room.status === 'playing') {
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
    for (const s of SLOTS) {
      const p = room.players[s];
      if (p) {
        p.progress = 0;
        p.errors = 0;
        p.wantsRematch = false;
      }
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

  const leaveRoom = (socket: Socket) => {
    const found = findBySocket(socket);
    if (!found) return;
    const { room, player } = found;
    socket.leave(room.id);
    socket.data.roomId = undefined;
    if (room.status === 'lobby') {
      for (const s of SLOTS) if (room.players[s] === player) room.players[s] = null;
      normalizeSlots(room);
      if (!room.players[1]) return destroyRoom(room);
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

    socket.on('room:create', (ack: unknown) => {
      leaveRoom(socket);
      const room = createRoom();
      const player = createPlayer(socket.id);
      room.players[1] = player;
      attach(socket, room, player);
      reply(ack, { ok: true, roomId: room.id, token: player.token });
      broadcast(room);
    });

    socket.on('room:join', (data: { roomId?: string }, ack: unknown) => {
      const code = String(data?.roomId ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return reply(ack, { ok: false, error: 'Room not found' });
      const existing = room.players[2];
      if (existing && existing.connected) return reply(ack, { ok: false, error: 'Room is full' });
      if (existing && room.status !== 'lobby') return reply(ack, { ok: false, error: 'Game in progress' });
      leaveRoom(socket);
      const player = createPlayer(socket.id);
      room.players[2] = player;
      attach(socket, room, player);
      reply(ack, { ok: true, roomId: room.id, token: player.token });
      broadcast(room);
    });

    socket.on('room:rejoin', (data: { roomId?: string; token?: string }, ack: unknown) => {
      const room = rooms.get(String(data?.roomId ?? ''));
      if (!room) return reply(ack, { ok: false });
      const slot = SLOTS.find((s) => room.players[s]?.token === data?.token);
      const player = slot ? room.players[slot] : null;
      if (!slot || !player) return reply(ack, { ok: false });
      attach(socket, room, player);
      if (room.text && room.status !== 'lobby') socket.emit('game:text', room.text);
      reply(ack, { ok: true, roomId: room.id });
      const both = SLOTS.every((s) => room.players[s]?.connected);
      if (room.status === 'paused' && both) resumeRound(room);
      else broadcast(room);
    });

    socket.on('room:leave', () => leaveRoom(socket));

    socket.on('room:settings', (data: { winningDifference?: number; p1Advantage?: number }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (room.players[1] !== player || room.status !== 'lobby') return; // host only
      if (typeof data?.winningDifference === 'number' && Number.isFinite(data.winningDifference))
        room.winningDifference = clampWinningDifference(data.winningDifference);
      if (typeof data?.p1Advantage === 'number' && Number.isFinite(data.p1Advantage))
        room.p1Advantage = clampAdvantage(data.p1Advantage);
      broadcast(room);
    });

    socket.on('game:start', () => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (room.players[1] !== player || room.status !== 'lobby') return;
      if (!SLOTS.every((s) => room.players[s]?.connected)) return;
      startNewRound(room);
    });

    socket.on('game:progress', (data: { progress?: unknown; errors?: unknown }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
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
      const result = checkWinner(
        room.players[1]?.progress ?? 0,
        room.players[2]?.progress ?? 0,
        room.winningDifference,
        room.p1Advantage
      );
      if (result.winner) {
        clearCountdown(room);
        room.status = 'finished';
        room.winner = result.winner;
        room.finalDifference = Math.abs(result.difference);
        room.endedAt = now;
      }
      broadcast(room);
    });

    socket.on('game:rematch', () => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (room.status !== 'finished') return;
      player.wantsRematch = true;
      const both = SLOTS.every((s) => room.players[s]?.connected && room.players[s]?.wantsRematch);
      if (both) startNewRound(room);
      else broadcast(room);
    });

    socket.on('room:lobby', () => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room } = found;
      if (room.status !== 'finished' && room.status !== 'paused') return;
      for (const s of SLOTS) {
        const p = room.players[s];
        if (p && !p.connected) room.players[s] = null; // drop the absent opponent
      }
      normalizeSlots(room);
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