import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { playError, playKey } from '../utils/sound';
import { findLine, wrapLines } from '../utils/text';

const COLS = 56;
const ROWS = 4;

interface Props {
  slot: 1 | 2;
  text: string;
  initialProgress: number;
  initialErrors: number;
  canType: () => boolean;
  onUpdate: (progress: number, errors: number) => void;
}

interface LineProps {
  text: string;
  mode: 'done' | 'current' | 'todo';
  offset: number;
  wrong: string | null;
}

const Line = memo(function Line({ text, mode, offset, wrong }: LineProps) {
  if (mode !== 'current') return <div className={`line ${mode}`}>{text}</div>;
  const ch = text[offset] ?? '';
  return (
    <div className="line current">
      <span className="typed">{text.slice(0, offset)}</span>
      {wrong !== null ? (
        <span className="cell wrong" data-expected={ch === ' ' ? '␣' : ch}>
          {wrong}
        </span>
      ) : (
        <span className="cell cursor">{ch}</span>
      )}
      <span className="upcoming">{text.slice(offset + 1)}</span>
    </div>
  );
});

export default function TypingArea({ slot, text, initialProgress, initialErrors, canType, onUpdate }: Props) {
  const [progress, setProgress] = useState(initialProgress);
  const [wrong, setWrong] = useState<string | null>(null);

  // Refs keep the key handler instant and free of stale closures.
  const progressRef = useRef(initialProgress);
  const errorsRef = useRef(initialErrors);
  const wrongRef = useRef<string | null>(null);
  const textRef = useRef(text);
  const canTypeRef = useRef(canType);
  const onUpdateRef = useRef(onUpdate);
  textRef.current = text;
  canTypeRef.current = canType;
  onUpdateRef.current = onUpdate;
  const boxRef = useRef<HTMLDivElement>(null);

  const starts = useMemo(() => wrapLines(text, COLS), [text]);

  useEffect(() => {
    const shake = () => {
      const el = boxRef.current;
      if (!el) return;
      el.classList.remove('shake');
      void el.offsetWidth; // restart animation
      el.classList.add('shake');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = textRef.current;
      if (!t) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (wrongRef.current !== null) {
          wrongRef.current = null;
          setWrong(null);
        }
        return; // correct characters can never be deleted
      }
      if (e.key.length !== 1) return;
      e.preventDefault(); // stop page scroll on space, quick-find on ', etc.
      if (e.repeat || !canTypeRef.current()) return;

      if (wrongRef.current !== null) {
        // error state: must Backspace first
        playError();
        shake();
        return;
      }
      const p = progressRef.current;
      if (p >= t.length) return;

      if (e.key === t[p]) {
        progressRef.current = p + 1;
        setProgress(p + 1);
        playKey();
        onUpdateRef.current(p + 1, errorsRef.current);
      } else {
        errorsRef.current += 1;
        wrongRef.current = e.key;
        setWrong(e.key);
        playError();
        shake();
        onUpdateRef.current(p, errorsRef.current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!text) return <div className="typing"><div className="muted">Loading text…</div></div>;

  const lineIdx = findLine(starts, progress);
  const first = Math.max(0, Math.min(lineIdx - 1, starts.length - ROWS));
  const rows = [];
  for (let i = first; i < Math.min(starts.length, first + ROWS); i++) {
    const s = starts[i];
    const e = i + 1 < starts.length ? starts[i + 1] : text.length;
    const mode = i < lineIdx ? 'done' : i === lineIdx ? 'current' : 'todo';
    rows.push(
      <Line
        key={i}
        text={text.slice(s, e)}
        mode={mode}
        offset={mode === 'current' ? progress - s : 0}
        wrong={mode === 'current' ? wrong : null}
      />
    );
  }

  return (
    <div className="typing" data-slot={slot} ref={boxRef}>
      {rows}
      <div className={`typing-status ${wrong !== null ? 'error' : ''}`}>
        {wrong !== null ? 'MISTAKE — PRESS BACKSPACE' : 'TYPE THE HIGHLIGHTED CHARACTER'}
      </div>
    </div>
  );
}