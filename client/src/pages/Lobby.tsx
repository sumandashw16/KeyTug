import { useState } from 'react';
import GameSettings from '../components/GameSettings';
import { BotConfig } from '../hooks/useRoom';
import { PublicPlayer, RoomState, Team } from '../types';
import { BOT_PRESETS, DEFAULT_PRESET } from '../utils/botPresets';
import { round1 } from '../utils/ropeMath';

interface Props {
  state: RoomState;
  onSettings: (patch: { winningDifference?: number }) => void;
  onTeam: (team: Team | null) => void;
  onWeight: (playerId: string, weight: number) => void;
  onAddBot: (team: Team, cfg: BotConfig) => void;
  onUpdateBot: (playerId: string, patch: Partial<BotConfig>) => void;
  onRemoveBot: (playerId: string) => void;
  onStart: () => void;
  onLeave: () => void;
}

export default function Lobby({
  state, onSettings, onTeam, onWeight, onAddBot, onUpdateBot, onRemoveBot, onStart, onLeave,
}: Props) {
  const isHost = state.hostId === state.you;
  const [copied, setCopied] = useState(false);
  const me = state.players.find((p) => p.id === state.you);
  const ready = ([1, 2] as Team[]).every((t) =>
    state.players.some((p) => p.team === t && p.connected)
  );

  const copy = () => {
    navigator.clipboard?.writeText(state.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const weightUI = (p: PublicPlayer) =>
    isHost ? (
      <div className="weight-ctl">
        <button onClick={() => onWeight(p.id, round1(p.weight - 0.1))}>−</button>
        <b>×{p.weight.toFixed(1)}</b>
        <button onClick={() => onWeight(p.id, round1(p.weight + 0.1))}>+</button>
        {[1, 1.5, 2].map((w) => (
          <button key={w} className={p.weight === w ? 'on' : ''} onClick={() => onWeight(p.id, w)}>
            {w}
          </button>
        ))}
      </div>
    ) : (
      <span className="weight-badge">×{p.weight.toFixed(1)}</span>
    );

  const botUI = (p: PublicPlayer) =>
    isHost ? (
      <div className="bot-ctl">
        <div className="bot-line">
          {BOT_PRESETS.map((pr) => (
            <button
              key={pr.id}
              className={p.botWpm === pr.wpm && p.botAccuracy === pr.accuracy ? 'on' : ''}
              onClick={() => onUpdateBot(p.id, { wpm: pr.wpm, accuracy: pr.accuracy })}
            >
              {pr.label}
            </button>
          ))}
        </div>
        <div className="bot-line">
          <button onClick={() => onUpdateBot(p.id, { wpm: p.botWpm - 5 })}>−</button>
          <b>{p.botWpm} WPM</b>
          <button onClick={() => onUpdateBot(p.id, { wpm: p.botWpm + 5 })}>+</button>
          <button onClick={() => onUpdateBot(p.id, { accuracy: p.botAccuracy - 1 })}>−</button>
          <b>{p.botAccuracy}% ACC</b>
          <button onClick={() => onUpdateBot(p.id, { accuracy: p.botAccuracy + 1 })}>+</button>
          <button className="x" onClick={() => onRemoveBot(p.id)} title="Remove bot">✕</button>
        </div>
      </div>
    ) : (
      <div className="bot-ctl">
        <span className="weight-badge">
          {p.botWpm} WPM · {p.botAccuracy}% ACC
        </span>
      </div>
    );

  const row = (p: PublicPlayer) => (
    <div key={p.id} className={`roster-row ${p.connected ? '' : 'off'}`}>
      <div className="rr-top">
        <span className="rr-name">
          {p.name}
          {p.id === state.hostId && <em>HOST</em>}
          {p.id === state.you && <em>YOU</em>}
          {p.isBot && <em>BOT</em>}
          {!p.connected && <b>OFFLINE</b>}
        </span>
        {p.team !== null && weightUI(p)}
      </div>
      {p.isBot && botUI(p)}
    </div>
  );

  const col = (team: Team) => {
    const list = state.players.filter((p) => p.team === team);
    return (
      <div className={`team-col tc-${team}`}>
        <div className="tc-head">
          TEAM {team === 1 ? 'A' : 'B'} <span>{list.length}</span>
        </div>
        <div className="tc-list">
          {list.length ? list.map(row) : <div className="muted small">No players yet</div>}
        </div>
        <div className="tc-actions">
          {me?.team !== team && (
            <button className="btn small" onClick={() => onTeam(team)}>
              JOIN TEAM {team === 1 ? 'A' : 'B'}
            </button>
          )}
          {isHost && (
            <button
              className="btn small"
              onClick={() => onAddBot(team, { wpm: DEFAULT_PRESET.wpm, accuracy: DEFAULT_PRESET.accuracy })}
            >
              + ADD BOT
            </button>
          )}
        </div>
      </div>
    );
  };

  const spectators = state.players.filter((p) => p.team === null);

  return (
    <div className="screen lobby">
      <div className="room-label">ROOM CODE</div>
      <button className="room-code" onClick={copy} title="Click to copy">
        {state.roomId}
      </button>
      <p className="muted">{copied ? 'Copied!' : 'Share this code. Anyone can join and pick a team.'}</p>

      <div className="teams">
        {col(1)}
        <div className="vs">VS</div>
        {col(2)}
      </div>

      <div className="spectate">
        {spectators.length > 0 && (
          <div className="muted small">SPECTATING: {spectators.map((p) => p.name).join(', ')}</div>
        )}
        {me?.team !== null && (
          <button className="link nomargin" onClick={() => onTeam(null)}>SPECTATE INSTEAD</button>
        )}
      </div>

      <p className="hint center">
        Weight = how much each of a player's correct characters counts. Strong player ×1.0, weaker
        player ×1.5 or ×2.0. Works for bots too.
        {!isHost && ' The host sets weights and bots.'}
      </p>

      <GameSettings
        winningDifference={state.winningDifference}
        editable={isHost}
        onChange={onSettings}
      />

      <div className="row">
        {isHost ? (
          <button className="btn primary" disabled={!ready} onClick={onStart}>
            {ready ? 'START GAME' : 'NEED A PLAYER ON EACH TEAM'}
          </button>
        ) : (
          <div className="muted">Waiting for the host to start the game…</div>
        )}
        <button className="btn" onClick={onLeave}>LEAVE</button>
      </div>
    </div>
  );
}