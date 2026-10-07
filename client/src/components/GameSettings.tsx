import { useEffect, useRef, useState } from 'react';
import Rope from './Rope';
import { requiredLead, startPosition } from '../utils/ropeMath';

interface Props {
  winningDifference: number;
  p1Advantage: number;
  editable: boolean;
  onChange: (patch: { winningDifference?: number; p1Advantage?: number }) => void;
}

const PRESETS = [25, 50, 100, 200, 500, 1000];
const BALANCES = [20, 30, 40, 50, 60, 70, 80]; // P1 share

export default function GameSettings({ winningDifference, p1Advantage, editable, onChange }: Props) {
  const p2Advantage = 100 - p1Advantage;
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
        <label>CHARACTERS AHEAD TO WIN</label>
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
      </div>

      <div className="setting-block">
        <label>ROPE BALANCE (manual handicap)</label>
        <div className="balance-readout">
          <span className="p1">PLAYER 1 ADVANTAGE <b>{p1Advantage}%</b></span>
          <span className="p2">PLAYER 2 ADVANTAGE <b>{p2Advantage}%</b></span>
        </div>
        <input
          type="range"
          min={10}
          max={90}
          step={1}
          value={p1Advantage}
          disabled={!editable}
          onChange={(e) => onChange({ p1Advantage: Number(e.target.value) })}
        />
        <div className="chips">
          {BALANCES.map((v) => (
            <button
              key={v}
              disabled={!editable}
              className={`chip-btn ${p1Advantage === v ? 'on' : ''}`}
              onClick={() => onChange({ p1Advantage: v })}
            >
              {v} / {100 - v}
            </button>
          ))}
        </div>
        <p className="hint">Higher % = bigger head start. 30 / 70 pulls the starting point toward Player 2.</p>
      </div>

      <div className="preview">
        <Rope
          compact
          showLead={false}
          lead={0}
          position={startPosition(p1Advantage)}
          startPosition={startPosition(p1Advantage)}
        />
        <div className="rope-meta">
          <span className="p1">P1 needs +{requiredLead(1, winningDifference, p1Advantage)}</span>
          <span className="p2">P2 needs +{requiredLead(2, winningDifference, p1Advantage)}</span>
        </div>
      </div>
    </div>
  );
}