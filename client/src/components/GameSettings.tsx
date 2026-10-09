import { useEffect, useRef, useState } from 'react';

interface Props {
  winningDifference: number;
  timeLimit: number; // seconds, 0 = no limit
  editable: boolean;
  onChange: (patch: { winningDifference?: number; timeLimit?: number }) => void;
}

const PRESETS = [25, 50, 100, 200, 500, 1000];
const TIME_PRESETS = [0, 60, 120, 180, 300, 600]; // seconds
const timeLabel = (s: number) => (s === 0 ? 'NO LIMIT' : `${s / 60} MIN`);
const minutesText = (s: number) => (s === 0 ? '' : String(Math.round((s / 60) * 100) / 100));

export default function GameSettings({ winningDifference, timeLimit, editable, onChange }: Props) {
  const [custom, setCustom] = useState(String(winningDifference));
  const [customTime, setCustomTime] = useState(minutesText(timeLimit));
  const inputRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setCustom(String(winningDifference));
  }, [winningDifference]);

  useEffect(() => {
    if (document.activeElement !== timeRef.current) setCustomTime(minutesText(timeLimit));
  }, [timeLimit]);

  const onCustom = (v: string) => {
    setCustom(v);
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 5 && n <= 10000) onChange({ winningDifference: n });
  };

  const onCustomTime = (v: string) => {
    setCustomTime(v);
    const mins = parseFloat(v);
    const secs = Math.round(mins * 60);
    if (Number.isFinite(mins) && secs >= 15 && secs <= 3600) onChange({ timeLimit: secs });
  };

  return (
    <div className={`settings ${editable ? '' : 'readonly'}`}>
      <div className="setting-block">
        <label>WEIGHTED POINTS AHEAD TO WIN</label>
        <div className="chips">
          {PRESETS.map((n) => (
            <button
              key={n}
              disabled={!editable}
              className={`chip-btn ${winningDifference === n ? 'on' : ''}`}
              onClick={() => onChange({ winningDifference: n })}
            >
              {n}
            </button>
          ))}
          <input
            ref={inputRef}
            className="num"
            type="number"
            min={5}
            max={10000}
            disabled={!editable}
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            onBlur={() => setCustom(String(winningDifference))}
          />
        </div>
        <p className="hint">
          Each correct character adds its player's weight to their team's score. First team to lead by
          this many points wins.
        </p>
      </div>

      <div className="setting-block">
        <label>TIME LIMIT</label>
        <div className="chips">
          {TIME_PRESETS.map((s) => (
            <button
              key={s}
              disabled={!editable}
              className={`chip-btn ${timeLimit === s ? 'on' : ''}`}
              onClick={() => onChange({ timeLimit: s })}
            >
              {timeLabel(s)}
            </button>
          ))}
          <input
            ref={timeRef}
            className="num"
            type="number"
            min={0.25}
            max={60}
            step={0.5}
            placeholder="min"
            disabled={!editable}
            value={customTime}
            onChange={(e) => onCustomTime(e.target.value)}
            onBlur={() => setCustomTime(minutesText(timeLimit))}
          />
          <span className="hint">custom, in minutes</span>
        </div>
        <p className="hint">
          {timeLimit === 0
            ? 'No limit: the match only ends when a team reaches the lead.'
            : 'When time runs out, the team with the higher score wins. Level scores are a draw. Reaching the lead first still wins early.'}
        </p>
      </div>
    </div>
  );
}