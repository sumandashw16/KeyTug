import { useEffect, useRef, useState } from 'react';

interface Props {
  winningDifference: number;
  editable: boolean;
  onChange: (patch: { winningDifference?: number }) => void;
}

const PRESETS = [25, 50, 100, 200, 500, 1000];

export default function GameSettings({ winningDifference, editable, onChange }: Props) {
  const [custom, setCustom] = useState(String(winningDifference));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setCustom(String(winningDifference));
  }, [winningDifference]);

  const onCustom = (v: string) => {
    setCustom(v);
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 5 && n <= 10000) onChange({ winningDifference: n });
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
    </div>
  );
}