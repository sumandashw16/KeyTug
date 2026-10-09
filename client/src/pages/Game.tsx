import { useCallback, useEffect, useRef, useState } from 'react';
import Countdown from '../components/Countdown';
import Rope from '../components/Rope';
import Scoreboard from '../components/Scoreboard';
import TeamPanel from '../components/TeamPanel';
import TypingArea from '../components/TypingArea';
import { serverNow } from '../socket/socket';
import { ropePosition, teamScore } from '../utils/ropeMath';
import { playLose, playWin } from '../utils/sound';
import Chat from '../components/Chat';
import { ChatMessage, RoomState } from '../types';

interface Props {
  state: RoomState;
  text: string;
  onProgress: (progress: number, errors: number) => void;
  onPlayAgain: () => void;
  onLobby: () => void;
  onLeave: () => void;
  chat: ChatMessage[];
  onChat: (text: string) => void;
}

const fmtTime = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Game({ state, text, onProgress, onPlayAgain, onLobby, onLeave, chat, onChat }: Props) {
  const me = state.players.find((p) => p.id === state.you);
  const myTeam = me?.team ?? null;
  const isHost = state.hostId === state.you;

  // Local typing state: updates instantly, never waits for the server.
  const [progress, setProgress] = useState(me?.progress ?? 0);
  const [errors, setErrors] = useState(me?.errors ?? 0);
  const initial = useRef({ progress: me?.progress ?? 0, errors: me?.errors ?? 0 });
  const live = useRef({ ...initial.current });
  const stateRef = useRef(state);
  stateRef.current = state;

  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 100);
    return () => clearInterval(id);
  }, []);

  const handleUpdate = useCallback(
    (p: number, e: number) => {
      live.current = { progress: p, errors: e };
      setProgress(p);
      setErrors(e);
      onProgress(p, e);
    },
    [onProgress]
  );

  const canType = useCallback(() => {
    const s = stateRef.current;
    return (s.status === 'playing' || s.status === 'countdown') && s.goAt !== null && serverNow() >= s.goAt;
  }, []);

  // Re-sync progress when play (re)starts, e.g. after a reconnect.
  useEffect(() => {
    if (state.status === 'playing' && myTeam) onProgress(live.current.progress, live.current.errors);
  }, [state.status, myTeam, onProgress]);

  useEffect(() => {
    if (state.status === 'finished' && myTeam && state.winner) (state.winner === myTeam ? playWin : playLose)();
  }, [state.status, state.winner, myTeam]);

  // ----- derived values (own progress comes from local state = instant) -----
  const players = state.players.map((p) => (p.id === state.you ? { ...p, progress, errors } : p));
  const team1 = players.filter((p) => p.team === 1);
  const team2 = players.filter((p) => p.team === 2);
  const s1 = teamScore(players, 1);
  const s2 = teamScore(players, 2);
  const diff = s1 - s2;
  const position = ropePosition(diff, state.winningDifference);

  const elapsed = state.clockStart ? (state.endedAt ?? now) - state.clockStart : 0;
  const msToGo = state.goAt !== null ? state.goAt - now : 0;
  const showCountdown = state.status === 'countdown' || (state.status === 'playing' && msToGo > -700);

  // ----- time limit -----
  const timed = state.timeLimitMs > 0;
  const running = state.deadline !== null && (state.status === 'playing' || state.status === 'countdown');
  const timeLeftMs = running
    ? Math.min(state.timeLimitMs, Math.max(0, (state.deadline as number) - now))
    : state.remainingMs;

  return (
    <div className="screen game">
      <header className="game-top">
        <span className="chip">ROOM {state.roomId}</span>
        <span className="chip">{state.winningDifference} POINTS AHEAD TO WIN</span>
        <span className={`chip timer ${timed && timeLeftMs <= 10000 && state.status === 'playing' ? 'low' : ''}`}>
          {timed ? `TIME ${fmtTime(timeLeftMs)}` : 'NO TIME LIMIT'}
        </span>
        <button className="link" onClick={onLeave}>LEAVE</button>
      </header>

      <section className="stats-row">
        <TeamPanel team={1} players={team1} youId={state.you} score={s1} elapsed={elapsed} />
        <TeamPanel team={2} players={team2} youId={state.you} score={s2} elapsed={elapsed} />
      </section>

      <section className="rope-section">
        <Rope position={position} lead={diff} />
      </section>

      {myTeam ? (
        <TypingArea
          slot={myTeam}
          text={text}
          initialProgress={initial.current.progress}
          initialErrors={initial.current.errors}
          canType={canType}
          onUpdate={handleUpdate}
        />
      ) : (
        <div className="spectating">SPECTATING</div>
      )}

      {showCountdown && <Countdown msToGo={msToGo} />}

      {state.status === 'paused' && (
        <div className="overlay">
          <div className="card">
            <h2>TEAM DISCONNECTED</h2>
            <p className="muted">
              A whole team has no players connected. The clock is paused. Waiting for someone to reconnect...
            </p>
            {isHost ? (
              <button className="btn" onClick={onLobby}>RETURN TO LOBBY</button>
            ) : (
              <p className="muted small">The host can return everyone to the lobby.</p>
            )}
          </div>
        </div>
      )}

      {state.status === 'finished' && (
        <Scoreboard
          players={state.players}
          winner={state.winner}
          endReason={state.endReason}
          myId={state.you}
          myTeam={myTeam}
          elapsed={elapsed}
          finalDifference={state.finalDifference}
          isHost={isHost}
          onPlayAgain={onPlayAgain}
          onLobby={onLobby}
          chat={<Chat messages={chat} myId={state.you} onSend={onChat} collapsible />}
        />
      )}
    </div>
  );
}