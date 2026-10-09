import { useEffect, useState } from 'react';
import { PublicPlayer, Team } from '../types';
import { round1 } from '../utils/ropeMath';
import { calcAccuracy, calcWpm } from '../utils/stats';

interface Props {
  players: PublicPlayer[];
  winner: Team;
  myId: string;
  myTeam: Team | null;
  elapsed: number;
  finalDifference: number;
  isHost: boolean;
  onPlayAgain: () => void;
  onLobby: () => void;
}

interface Row {
  p: PublicPlayer;
  wpm: number;
  acc: number;
  perf: number; // WPM x accuracy^2, decides ordering and MVPs
  points: number; // weighted contribution to the rope
}

function CountUp({ to, delay = 0, ms = 900, decimals = 0 }: { to: number; delay?: number; ms?: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, ms]);
  return <>{decimals ? v.toFixed(decimals) : Math.round(v)}</>;
}

export default function Scoreboard({
  players, winner, myId, myTeam, elapsed, finalDifference, isHost, onPlayAgain, onLobby,
}: Props) {
  const build = (team: Team): Row[] =>
    players
      .filter((p) => p.team === team)
      .map((p) => {
        const wpm = calcWpm(p.progress, elapsed);
        const acc = calcAccuracy(p.progress, p.errors);
        return { p, wpm, acc, perf: wpm * (acc / 100) ** 2, points: p.weight * p.progress };
      })
      .sort((a, b) => b.perf - a.perf || b.p.progress - a.p.progress);

  const rowsByTeam: Record<Team, Row[]> = { 1: build(1), 2: build(2) };
  const loser: Team = winner === 1 ? 2 : 1;
  const order: Team[] = [winner, loser];

  // Team MVP = top of each team. Match MVP = best of those two.
  const teamMvp: Record<Team, string | null> = {
    1: rowsByTeam[1][0]?.p.progress > 0 ? rowsByTeam[1][0].p.id : null,
    2: rowsByTeam[2][0]?.p.progress > 0 ? rowsByTeam[2][0].p.id : null,
  };
  const candidates = ([1, 2] as Team[])
    .map((t) => rowsByTeam[t][0])
    .filter((r) => r && r.p.progress > 0);
  const matchMvp = candidates.sort((a, b) => b.perf - a.perf || b.p.progress - a.p.progress)[0]?.p.id ?? null;

  const iWon = myTeam !== null && myTeam === winner;
  const teamName = (t: Team) => (t === 1 ? 'TEAM A' : 'TEAM B');
  const banner = myTeam === null ? `${teamName(winner)} WINS` : iWon ? 'VICTORY' : 'DEFEAT';

  let n = 0; // running row index for staggered animation
  const box = (team: Team) => {
    const rows = rowsByTeam[team];
    const won = team === winner;
    const total = rows.reduce((s, r) => s + r.points, 0);
    return (
      <div className={`sb-box ${won ? 'won' : 'lost'} sb-t${team}`} key={team}>
        <div className="sb-head">
          <span className="sb-result">{won ? 'WINNERS' : 'LOSERS'}</span>
          <span className="sb-team">{teamName(team)}</span>
          <span className="sb-total">{round1(total)} PTS</span>
        </div>
        <div className="sb-cols">
          <span>#</span>
          <span>PLAYER</span>
          <span>WPM</span>
          <span>ACC</span>
          <span>CORRECT</span>
          <span>MISTAKES</span>
          <span>POINTS</span>
        </div>
        {rows.map((r, i) => {
          const delay = 250 + n++ * 120;
          const isMatch = r.p.id === matchMvp;
          const isTeam = !isMatch && r.p.id === teamMvp[team];
          return (
            <div
              key={r.p.id}
              className={`sb-row ${r.p.id === myId ? 'me' : ''} ${isMatch ? 'mvp' : ''} ${r.p.connected ? '' : 'off'}`}
              style={{ animationDelay: `${delay}ms` }}
            >
              <span className="sb-rank">{i + 1}</span>
              <span className="sb-name">
                {r.p.name}
                {r.p.id === myId && <em>YOU</em>}
                {r.p.isBot && <em>BOT</em>}
                {r.p.weight !== 1 && <i>×{r.p.weight.toFixed(1)}</i>}
                {!r.p.connected && <b>OFFLINE</b>}
                {isMatch && <u className="gold">★ MATCH MVP</u>}
                {isTeam && <u className="silver">TEAM MVP</u>}
              </span>
              <span className="sb-num"><CountUp to={r.wpm} delay={delay} /></span>
              <span className="sb-num"><CountUp to={r.acc} delay={delay} />%</span>
              <span className="sb-num"><CountUp to={r.p.progress} delay={delay} /></span>
              <span className="sb-num"><CountUp to={r.p.errors} delay={delay} /></span>
              <span className="sb-num"><CountUp to={r.points} delay={delay} decimals={r.points % 1 ? 1 : 0} /></span>
            </div>
          );
        })}
        {rows.length === 0 && <div className="sb-empty">No players</div>}
      </div>
    );
  };

  return (
    <div className="overlay sb-overlay">
      <div className="scoreboard">
        <div className={`sb-banner ${myTeam === null ? 'neutral' : iWon ? 'win' : 'lose'}`}>
          <h2>{banner}</h2>
          <p>
            {teamName(winner)} won by <b>{finalDifference}</b> points
          </p>
        </div>

        {order.map(box)}

        <div className="row sb-actions">
          {isHost ? (
            <>
              <button className="btn primary" onClick={onPlayAgain}>PLAY AGAIN</button>
              <button className="btn" onClick={onLobby}>RETURN TO LOBBY</button>
            </>
          ) : (
            <p className="muted">Waiting for the host to play again or return to the lobby…</p>
          )}
        </div>
      </div>
    </div>
  );
}