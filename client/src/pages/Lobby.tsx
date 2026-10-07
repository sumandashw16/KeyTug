import { useState } from 'react';
import GameSettings from '../components/GameSettings';
import { RoomState } from '../types';

interface Props {
  state: RoomState;
  onSettings: (patch: { winningDifference?: number; p1Advantage?: number }) => void;
  onStart: () => void;
  onLeave: () => void;
}

export default function Lobby({ state, onSettings, onStart, onLeave }: Props) {
  const isHost = state.you === 1;
  const [copied, setCopied] = useState(false);
  const p1 = state.players[1];
  const p2 = state.players[2];
  const both = !!p1?.connected && !!p2?.connected;

  const copy = () => {
    navigator.clipboard?.writeText(state.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const card = (slot: 1 | 2, present: boolean) => (
    <div className={`player-card pc-${slot} ${present ? 'ready' : ''}`}>
      <div className="pc-name">
        PLAYER {slot}
        {slot === 1 && <em>HOST</em>}
        {state.you === slot && <em>YOU</em>}
      </div>
      <div className="pc-check">{present ? '✓' : '…'}</div>
      <div className="pc-status">
        {present ? 'READY' : state.players[slot] ? 'DISCONNECTED' : 'WAITING'}
      </div>
    </div>
  );

  return (
    <div className="screen lobby">
      <div className="room-label">{isHost ? 'YOUR ROOM CODE' : 'ROOM CODE'}</div>
      <button className="room-code" onClick={copy} title="Click to copy">
        {state.roomId}
      </button>
      <p className="muted">{copied ? 'Copied!' : 'Share this code with your opponent.'}</p>

      <div className="versus">
        {card(1, !!p1?.connected)}
        <div className="vs">VS</div>
        {card(2, !!p2?.connected)}
      </div>

      <GameSettings
        winningDifference={state.winningDifference}
        p1Advantage={state.p1Advantage}
        editable={isHost}
        onChange={onSettings}
      />

      <div className="row">
        {isHost ? (
          <button className="btn primary" disabled={!both} onClick={onStart}>
            {both ? 'START GAME' : 'WAITING FOR OPPONENT…'}
          </button>
        ) : (
          <div className="muted">Waiting for the host to start the game…</div>
        )}
        <button className="btn" onClick={onLeave}>LEAVE</button>
      </div>
    </div>
  );
}