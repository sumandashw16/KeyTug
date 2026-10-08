import { PublicPlayer, Team } from '../types';
import { round1 } from '../utils/ropeMath';
import { calcAccuracy, calcWpm } from '../utils/stats';

interface Props {
  team: Team;
  players: PublicPlayer[];
  youId: string;
  score: number;
  elapsed: number;
}

export default function TeamPanel({ team, players, youId, score, elapsed }: Props) {
  return (
    <div className={`team-panel team-${team}`}>
      <div className="tp-head">
        <span className="tp-name">TEAM {team === 1 ? 'A' : 'B'}</span>
        <span className="tp-score">{round1(score)}</span>
      </div>
      <div className="tp-sub">
        WEIGHTED SCORE · {players.length} PLAYER{players.length === 1 ? '' : 'S'}
      </div>
      <div className="tp-list">
        {players.map((p) => (
          <div key={p.id} className={`tp-row ${p.connected ? '' : 'off'} ${p.id === youId ? 'me' : ''}`}>
            <span className="tp-pname">
              {p.name}
              {p.id === youId && <em>YOU</em>}
              {p.weight !== 1 && <i>×{p.weight.toFixed(1)}</i>}
              {!p.connected && <b>OFFLINE</b>}
            </span>
            <span>{calcWpm(p.progress, elapsed)} WPM</span>
            <span>{calcAccuracy(p.progress, p.errors)}%</span>
            <span>{p.progress}</span>
          </div>
        ))}
      </div>
    </div>
  );
}