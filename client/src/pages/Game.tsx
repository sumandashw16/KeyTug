import { useCallback, useEffect, useRef, useState } from 'react';
import Countdown from '../components/Countdown';
import PlayerStats from '../components/PlayerStats';
import Rope from '../components/Rope';
import TypingArea from '../components/TypingArea';
import { serverNow } from '../socket/socket';
import { RoomState, Slot } from '../types';
import { requiredLead, ropePosition, startPosition } from '../utils/ropeMath';
import { playLose, playWin } from '../utils/sound';
import { calcAccuracy, calcWpm } from '../utils/stats';

interface Props {
  state: RoomState;
  text: string;
  onProgress: (progress: number, errors: number) => void;
  onRematch: () => void;
  onLobby: () => void;
  onLeave: () => void;
}

export default function Game({ state, text, onProgress, onRematch, onLobby, onLeave }: Props) {
  const you = state.you;
  const opp: Slot = you === 1 ? 2 : 1;
  const me = state.players[you];
  const other = state.players[opp];

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
    if (state.status === 'playing') onProgress(live.current.progress, live.current.errors);
  }, [state.status, onProgress]);

  useEffect(() => {
    if (state.status === 'finished') (state.winner === state.you ? playWin : playLose)();
  }, [state.status, state.winner, state.you]);

  // ----- derived values -----
  const p1 = you === 1 ? progress : state.players[1]?.progress ?? 0;
  const p2 = you === 2 ? progress : state.players[2]?.progress ?? 0;
  const e1 = you === 1 ? errors : state.players[1]?.errors ?? 0;
  const e2 = you === 2 ? errors : state.players[2]?.errors ?? 0;
  const diff = p1 - p2;
  const position = ropePosition(diff, state.winningDifference, state.p1Advantage);

  const elapsed = state.clockStart ? (state.endedAt ?? now) - state.clockStart : 0;
  const msToGo = state.goAt !== null ? state.goAt - now : 0;
  const showCountdown = state.status === 'countdown' || (state.status === 'playing' && msToGo > -700);

  const oppGone = !other || !other.connected;
  const showDisconnect = state.status === 'paused' || (oppGone && state.status !== 'finished');
  const iWon = state.winner === you;

  return (
    <div className="screen game">
      <header className="game-top">
        <span className="chip">ROOM {state.roomId}</span>
        <span className="chip">{state.winningDifference} AHEAD TO WIN</span>
        <button className="link" onClick={onLeave}>LEAVE</button>
      </header>

      <section className="stats-row">
        <PlayerStats
          slot={1}
          isYou={you === 1}
          connected={state.players[1]?.connected ?? false}
          wpm={calcWpm(p1, elapsed)}
          accuracy={calcAccuracy(p1, e1)}
          correct={p1}
        />
        <PlayerStats
          slot={2}
          isYou={you === 2}
          connected={state.players[2]?.connected ?? false}
          wpm={calcWpm(p2, elapsed)}
          accuracy={calcAccuracy(p2, e2)}
          correct={p2}
        />
      </section>

      <section className="rope-section">
        <Rope position={position} startPosition={startPosition(state.p1Advantage)} lead={diff} />
        <div className="rope-meta">
          <span className="p1">P1 needs +{requiredLead(1, state.winningDifference, state.p1Advantage)}</span>
          <span className="p2">P2 needs +{requiredLead(2, state.winningDifference, state.p1Advantage)}</span>
        </div>
      </section>

      <TypingArea
        slot={you}
        text={text}
        initialProgress={initial.current.progress}
        initialErrors={initial.current.errors}
        canType={canType}
        onUpdate={handleUpdate}
      />

      {showCountdown && <Countdown msToGo={msToGo} />}

      {showDisconnect && (
        <div className="overlay">
          <div className="card">
            <h2>OPPONENT DISCONNECTED</h2>
            <p className="muted">Waiting for them to reconnect...</p>
            <button className="btn" onClick={onLobby}>RETURN TO LOBBY</button>
          </div>
        </div>
      )}

      {state.status === 'finished' && state.winner && (
        <div className="overlay">
          <div className={`card result ${iWon ? 'win' : 'lose'}`}>
            {iWon ? (
              <>
                <div className="trophy">🏆</div>
                <h2>PLAYER {state.winner} WINS!</h2>
                <p>You pulled the rope all the way!</p>
                <p className="big">{state.finalDifference} characters ahead</p>
              </>
            ) : (
              <>
                <h2>PLAYER {state.winner} WINS</h2>
                <p>You were {state.finalDifference} characters behind.</p>
              </>
            )}
            {oppGone && <p className="muted">Your opponent left the room.</p>}
            <div className="row">
              <button className="btn primary" disabled={!!me?.wantsRematch || oppGone} onClick={onRematch}>
                {me?.wantsRematch
                  ? 'WAITING FOR OPPONENT…'
                  : other?.wantsRematch
                  ? 'PLAY AGAIN (OPPONENT READY)'
                  : 'PLAY AGAIN'}
              </button>
              <button className="btn" onClick={onLobby}>RETURN TO LOBBY</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}