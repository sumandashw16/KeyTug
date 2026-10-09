import { useCallback, useEffect, useState } from 'react';
import { clearSession, loadSession, saveSession, socket, syncClock } from '../socket/socket';
import { ChatMessage, RoomState, Team } from '../types';
import { unlockAudio } from '../utils/sound';

interface Ack {
  ok: boolean;
  error?: string;
  roomId?: string;
  token?: string;
}

export interface BotConfig {
  wpm: number;
  accuracy: number;
}

export function useRoom() {
  const [state, setState] = useState<RoomState | null>(null);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(socket.connected);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const onConnect = async () => {
      setConnected(true);
      await syncClock();
      const session = loadSession();
      if (!session) {
        setReady(true);
        return;
      }
      socket.emit('room:rejoin', session, (res: Ack) => {
        if (!res.ok) {
          clearSession();
          setState(null);
        }
        setReady(true);
      });
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: RoomState) => setState(s);
    const onText = (t: string) => setText(t);
    const onChatHistory = (h: ChatMessage[]) => setChat(h);
    const onChatMessage = (m: ChatMessage) =>
      setChat((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m].slice(-100)));

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    socket.on('game:text', onText);
    socket.on('chat:history', onChatHistory);
    socket.on('chat:message', onChatMessage);
    if (socket.connected) void onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
      socket.off('game:text', onText);
      socket.off('chat:history', onChatHistory);
      socket.off('chat:message', onChatMessage);
    };
  }, []);

  const createRoom = useCallback((name: string, bot?: BotConfig) => {
    unlockAudio();
    setError(null);
    socket.emit('room:create', { name, bot }, (res: Ack) => {
      if (res.ok && res.roomId && res.token) saveSession({ roomId: res.roomId, token: res.token });
      else setError(res.error ?? 'Could not create room');
    });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    unlockAudio();
    setError(null);
    socket.emit('room:join', { roomId: code, name }, (res: Ack) => {
      if (res.ok && res.roomId && res.token) saveSession({ roomId: res.roomId, token: res.token });
      else setError(res.error ?? 'Could not join room');
    });
  }, []);

  const updateSettings = useCallback(
    (patch: { winningDifference?: number; timeLimit?: number }) => socket.emit('room:settings', patch),
    []
  );
  const setTeam = useCallback((team: Team | null) => socket.emit('room:team', { team }), []);
  const setWeight = useCallback(
    (playerId: string, weight: number) => socket.emit('room:weight', { playerId, weight }),
    []
  );
  const addBot = useCallback(
    (team: Team, cfg: BotConfig) => socket.emit('bot:add', { team, ...cfg }),
    []
  );
  const updateBot = useCallback(
    (playerId: string, patch: Partial<BotConfig>) => socket.emit('bot:update', { playerId, ...patch }),
    []
  );
  const removeBot = useCallback((playerId: string) => socket.emit('bot:remove', { playerId }), []);
  const startGame = useCallback(() => {
    unlockAudio();
    socket.emit('game:start');
  }, []);
  const sendProgress = useCallback(
    (progress: number, errors: number) => socket.emit('game:progress', { progress, errors }),
    []
  );
  const sendChat = useCallback((text: string) => socket.emit('chat:send', { text }), []);
  const playAgain = useCallback(() => socket.emit('game:again'), []);
  const backToLobby = useCallback(() => socket.emit('room:lobby'), []);
  const leave = useCallback(() => {
    socket.emit('room:leave');
    clearSession();
    setState(null);
    setText('');
    setChat([]);
  }, []);

  return {
    state, text, connected, ready, error, chat,
    createRoom, joinRoom, updateSettings, setTeam, setWeight,
    addBot, updateBot, removeBot,
    startGame, sendProgress, sendChat, playAgain, backToLobby, leave,
  };
}