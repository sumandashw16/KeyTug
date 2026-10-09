import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { checkWinner, clampWeight, clampWinningDifference, teamScore } from '../game/logic';
import { clampBotAccuracy, clampBotWpm, resetBots, stepBots } from '../game/bots';
import { createBot, createPlayer, createRoom, hostOf, resetToLobby, rooms, toState } from '../game/rooms';
import { generateText } from '../game/text';
import { ChatMessage, Player, Room, Team } from '../game/types';

const COUNTDOWN_MS = 3000;
const MAX_CPS = 25; // plausibility cap per human: 25 chars/sec
const BURST_ALLOWANCE = 40;
const EMPTY_ROOM_TTL_MS = 2 * 60 * 1000;
const MAX_PLAYERS = 16; // humans + bots
const BOT_TICK_MS = 50;
const TIME_GRACE_MS = 250; // lets in-flight keystrokes land at the buzzer
const TEAMS: Team[] = [1, 2];
const CHAT_MAX_LEN = 200;
const CHAT_HISTORY = 100;
const CHAT_WINDOW_MS = 5000;
const CHAT_MAX_PER_WINDOW = 5;
const chatTimes = new WeakMap<Player, number[]>();

const reply = (ack: unknown, payload: unknown) => {
  if (typeof ack === 'function') (ack as (p: unknown) => void)(payload);
};

const cleanName = (raw: unknown, fallback: string) => {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return s || fallback;
};

const botParams = (raw: { wpm?: unknown; accuracy?: unknown } | undefined) => ({
  wpm: clampBotWpm(Number(raw?.wpm) || 55),
  accuracy: clampBotAccuracy(Number(raw?.accuracy) || 95),
});

/** seconds in, seconds out. 0 = no limit, otherwise 15s..60min */
const clampTimeLimit = (s: number) => (s <= 0 ? 0 : Math.min(3600, Math.max(15, Math.round(s))));

export function registerSocketHandlers(io: Server): void {
  // ---------- helpers ----------
  const broadcast = (room: Room) => {
    for (const p of room.players) {
      if (!p.isBot && p.connected && p.socketId) io.to(p.socketId).emit('room:state', toState(room, p.id));
    }
  };

  const clearCountdown = (room: Room) => {
    if (room.countdownTimer) clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  };

    const addChat = (
    room: Room,
    m: { kind: 'user' | 'system'; text: string; name?: string; team?: Team | null; playerId?: string | null }
  ) => {
    const msg: ChatMessage = {
      id: ++room.chatSeq,
      kind: m.kind,
      name: m.name ?? '',
      team: m.team ?? null,
      playerId: m.playerId ?? null,
      text: m.text,
      at: Date.now(),
    };
    room.chat.push(msg);
    if (room.chat.length > CHAT_HISTORY) room.chat.shift();
    io.to(room.id).emit('chat:message', msg);
  };
  const say = (room: Room, text: string) => addChat(room, { kind: 'system', text });

  const clearTimeLimit = (room: Room) => {
    if (room.timeTimer) clearTimeout(room.timeTimer);
    room.timeTimer = null;
  };

  /** Stop the round clock and remember how much time is left. */
  const freezeTimer = (room: Room, now: number) => {
    clearTimeLimit(room);
    if (room.deadline !== null) {
      room.remainingMs = Math.max(0, room.deadline - Math.max(now, room.goAt ?? now));
      room.deadline = null;
    }
  };

  const stopBots = (room: Room) => {
    if (room.botTimer) clearInterval(room.botTimer);
    room.botTimer = null;
  };

  const destroyRoom = (room: Room) => {
    clearCountdown(room);
    clearTimeLimit(room);
    stopBots(room);
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    rooms.delete(room.id);
  };

  const humansConnected = (room: Room) => room.players.some((p) => p.connected && !p.isBot);

  const updateCleanup = (room: Room) => {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
    if (!humansConnected(room)) {
      room.cleanupTimer = setTimeout(() => destroyRoom(room), EMPTY_ROOM_TTL_MS);
    }
  };

  /** Both teams need at least one connected player (a bot counts). */
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
    const player = room.players.find((p) => !p.isBot && p.socketId === socket.id);
    return player ? { room, player } : null;
  };

  const attach = (socket: Socket, room: Room, player: Player) => {
    player.socketId = socket.id;
    player.connected = true;
    socket.data.roomId = room.id;
    socket.join(room.id);
    updateCleanup(room);
  };

  /** Server decides the winner by lead. Returns true if the round just ended. */
  const finishIfWon = (room: Room, now: number): boolean => {
    const result = checkWinner(room.players, room.winningDifference);
    if (!result.winner) return false;
    clearCountdown(room);
    stopBots(room);
    freezeTimer(room, now);
    room.status = 'finished';
    room.winner = result.winner;
    room.endReason = 'lead';
    room.finalDifference = Math.round(Math.abs(result.difference) * 10) / 10;
    room.endedAt = now;
    say(room, 'Match finished');
    return true;
  };

  /** Time ran out: higher weighted score wins, exactly level = draw. */
  const finishByTime = (room: Room) => {
    if (room.status !== 'playing' && room.status !== 'countdown') return;
    const endAt = room.deadline ?? Date.now();
    const diff = teamScore(room.players, 1) - teamScore(room.players, 2);
    clearCountdown(room);
    clearTimeLimit(room);
    stopBots(room);
    room.deadline = null;
    room.remainingMs = 0;
    room.status = 'finished';
    room.winner = Math.abs(diff) < 1e-9 ? null : diff > 0 ? 1 : 2;
    room.endReason = 'time';
    room.finalDifference = Math.round(Math.abs(diff) * 10) / 10;
    room.endedAt = endAt;
    say(room, 'Match finished');
    broadcast(room);
  };

  /** (Re)start the round clock from goAt using the remaining time. */
  const armTimer = (room: Room) => {
    clearTimeLimit(room);
    if (room.timeLimitMs <= 0 || room.goAt === null) {
      room.deadline = null;
      return;
    }
    room.deadline = room.goAt + room.remainingMs;
    const delay = Math.max(0, room.deadline - Date.now()) + TIME_GRACE_MS;
    room.timeTimer = setTimeout(() => {
      room.timeTimer = null;
      finishByTime(room);
    }, delay);
  };

  const startBots = (room: Room) => {
    stopBots(room);
    if (!room.players.some((p) => p.isBot)) return;
    resetBots(room);
    room.botTimer = setInterval(() => {
      if (room.status !== 'playing') return;
      const now = Date.now();
      if (!stepBots(room, now)) return;
      finishIfWon(room, now);
      broadcast(room);
    }, BOT_TICK_MS);
  };

  const markDisconnected = (room: Room, player: Player) => {
    player.connected = false;
    player.socketId = null;
    // Game continues unless a whole team is gone or no human is left.
    if (
      (room.status === 'countdown' || room.status === 'playing') &&
      (!teamsReady(room) || !humansConnected(room))
    ) {
      clearCountdown(room);
      stopBots(room);
      const now = Date.now();
      freezeTimer(room, now);
      room.pausedFrom = room.status;
      room.status = 'paused';
      room.pausedAt = now;
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
    armTimer(room);
    startBots(room);
  };

  const startNewRound = (room: Room) => {
    room.round += 1;
    for (const p of room.players) {
      p.progress = 0;
      p.errors = 0;
    }
    room.text = generateText();
    room.winner = null;
    room.endReason = null;
    room.finalDifference = 0;
    room.endedAt = null;
    room.pausedAt = null;
    room.pausedFrom = null;
    room.remainingMs = room.timeLimitMs;
    beginCountdown(room);
    room.clockStart = room.goAt;
    io.to(room.id).emit('game:text', room.text); // text first, then state
    broadcast(room);
  };

  const resumeRound = (room: Room) => {
    const from = room.pausedFrom;
    const pausedAt = room.pausedAt;
    beginCountdown(room); // re-arms the clock with the time that was left
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
      if (!room.players.some((p) => !p.isBot)) return destroyRoom(room);
      say(room, `${player.name} left`);
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

    socket.on(
      'room:create',
      (data: { name?: string; bot?: { wpm?: number; accuracy?: number } }, ack: unknown) => {
        leaveRoom(socket);
        const room = createRoom();
        const player = createPlayer(socket.id, cleanName(data?.name, 'Player 1'), 1);
        room.players.push(player);
        if (data?.bot) {
          const b = botParams(data.bot);
          room.players.push(createBot(room, 2, b.wpm, b.accuracy));
        }
        attach(socket, room, player);
        socket.emit('chat:history', room.chat);
        reply(ack, { ok: true, roomId: room.id, token: player.token });
        broadcast(room);
      }
    );

    socket.on('room:join', (data: { roomId?: string; name?: string }, ack: unknown) => {
      const code = String(data?.roomId ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return reply(ack, { ok: false, error: 'Room not found' });
      if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'Game already in progress' });
      if (room.players.length >= MAX_PLAYERS) return reply(ack, { ok: false, error: 'Room is full' });
      leaveRoom(socket);
      const humans = room.players.filter((p) => !p.isBot).length;
      const player = createPlayer(socket.id, cleanName(data?.name, `Player ${humans + 1}`), smallerTeam(room));
      room.players.push(player);
      attach(socket, room, player);
      socket.emit('chat:history', room.chat);
      say(room, `${player.name} joined`);
      reply(ack, { ok: true, roomId: room.id, token: player.token });
      broadcast(room);
    });

    socket.on('room:rejoin', (data: { roomId?: string; token?: string }, ack: unknown) => {
      const room = rooms.get(String(data?.roomId ?? ''));
      if (!room) return reply(ack, { ok: false });
      const player = room.players.find((p) => !p.isBot && p.token === data?.token);
      if (!player) return reply(ack, { ok: false });
      attach(socket, room, player);
      socket.emit('chat:history', room.chat);
      if (room.text && room.status !== 'lobby') socket.emit('game:text', room.text);
      reply(ack, { ok: true, roomId: room.id });
      if (room.status === 'paused' && teamsReady(room) && humansConnected(room)) resumeRound(room);
      else broadcast(room);
    });

    socket.on('room:leave', () => leaveRoom(socket));

    socket.on('room:settings', (data: { winningDifference?: number; timeLimit?: number }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      if (typeof data?.winningDifference === 'number' && Number.isFinite(data.winningDifference)) {
        room.winningDifference = clampWinningDifference(data.winningDifference);
      }
      if (typeof data?.timeLimit === 'number' && Number.isFinite(data.timeLimit)) {
        room.timeLimitMs = clampTimeLimit(data.timeLimit) * 1000;
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
        say(room, t === null ? `${player.name} is now spectating` : `${player.name} joined Team ${t === 1 ? 'A' : 'B'}`);
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

    socket.on('chat:send', (data: { text?: unknown }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (room.status !== 'lobby' && room.status !== 'finished') return; // closed during matches
      const text = String(data?.text ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, CHAT_MAX_LEN);
      if (!text) return;
      const now = Date.now();
      const recent = (chatTimes.get(player) ?? []).filter((t) => now - t < CHAT_WINDOW_MS);
      if (recent.length >= CHAT_MAX_PER_WINDOW) return; // rate limit
      recent.push(now);
      chatTimes.set(player, recent);
      addChat(room, { kind: 'user', text, name: player.name, team: player.team, playerId: player.id });
    });
    
    // ----- bots (host, lobby only) -----
    socket.on('bot:add', (data: { team?: unknown; wpm?: number; accuracy?: number }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      if (data?.team !== 1 && data?.team !== 2) return;
      if (room.players.length >= MAX_PLAYERS) return;
      const b = botParams(data);
      room.players.push(createBot(room, data.team, b.wpm, b.accuracy));
      broadcast(room);
    });

    socket.on('bot:update', (data: { playerId?: string; wpm?: number; accuracy?: number }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      const bot = room.players.find((p) => p.isBot && p.id === data?.playerId);
      if (!bot) return;
      if (typeof data.wpm === 'number' && Number.isFinite(data.wpm)) bot.botWpm = clampBotWpm(data.wpm);
      if (typeof data.accuracy === 'number' && Number.isFinite(data.accuracy))
        bot.botAccuracy = clampBotAccuracy(data.accuracy);
      broadcast(room);
    });

    socket.on('bot:remove', (data: { playerId?: string }) => {
      const found = findBySocket(socket);
      if (!found) return;
      const { room, player } = found;
      if (!isHost(room, player) || room.status !== 'lobby') return;
      room.players = room.players.filter((p) => !(p.isBot && p.id === data?.playerId));
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
      finishIfWon(room, now);
      broadcast(room);
    });

    // Host starts another round with the same teams, bots, weights and time limit.
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