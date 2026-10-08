import { useEffect, useState } from 'react';
import Rope from '../components/Rope';
import { BotConfig } from '../hooks/useRoom';
import { BOT_PRESETS, DEFAULT_PRESET } from '../utils/botPresets';

interface Props {
  onCreate: (name: string, bot?: BotConfig) => void;
  onJoin: (code: string, name: string) => void;
  error: string | null;
}

export default function Home({ onCreate, onJoin, error }: Props) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(DEFAULT_PRESET.id);
  const [code, setCode] = useState('');
  const [pos, setPos] = useState(50);

  // decorative ambient rope motion
  useEffect(() => {
    const id = setInterval(() => setPos(50 + 22 * Math.sin(Date.now() / 900)), 40);
    return () => clearInterval(id);
  }, []);

  const preset = BOT_PRESETS.find((p) => p.id === level) ?? DEFAULT_PRESET;
  const submitJoin = () => code.trim().length > 0 && onJoin(code.trim().toUpperCase(), name);

  return (
    <div className="screen home">
      <h1 className="title">
        TYPING <span>TUG</span> OF WAR
      </h1>
      <p className="subtitle">Type faster. Stay accurate. Pull harder.</p>

      <div className="home-rope">
        <Rope position={pos} lead={0} showLead={false} />
      </div>

      <div className="name-row">
        <label>YOUR NAME</label>
        <input
          className="name-input"
          maxLength={14}
          placeholder="PLAYER"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <h2 className="section-title">CHOOSE HOW TO PLAY</h2>
      <div className="modes">
        <div className="mode-card mc-solo">
          <span className="mc-tag">SOLO</span>
          <h3 className="mc-title">VS COMPUTER</h3>
          <p className="mc-desc">Race a bot that makes human mistakes. Pick how fast it types.</p>
          <div className="level-chips">
            {BOT_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`level-btn ${level === p.id ? 'on' : ''}`}
                onClick={() => setLevel(p.id)}
              >
                {p.label}
                <small>{p.wpm} WPM</small>
              </button>
            ))}
          </div>
          <button
            className="btn primary"
            onClick={() => onCreate(name, { wpm: preset.wpm, accuracy: preset.accuracy })}
          >
            PLAY VS COMPUTER
          </button>
        </div>

        <div className="mode-card mc-friends">
          <span className="mc-tag">MULTIPLAYER</span>
          <h3 className="mc-title">PLAY WITH FRIENDS</h3>
          <p className="mc-desc">
            Create a room and share the code. 1v1 or teams of any size, custom weights for uneven
            skill, and you can add bots to either team.
          </p>
          <button className="btn primary" onClick={() => onCreate(name)}>CREATE GAME</button>
        </div>

        <div className="mode-card mc-join">
          <span className="mc-tag">HAVE A CODE?</span>
          <h3 className="mc-title">JOIN A GAME</h3>
          <p className="mc-desc">Enter the 5-character room code your friend shared.</p>
          <input
            className="code-input"
            maxLength={5}
            placeholder="K7X92"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && submitJoin()}
          />
          <button className="btn" onClick={submitJoin}>JOIN GAME</button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="how">
        <div className="how-step">
          <b>1</b>
          <h4>SAME TEXT</h4>
          <p>Everyone types the exact same text at the same moment.</p>
        </div>
        <div className="how-step">
          <b>2</b>
          <h4>NO SKIPPING MISTAKES</h4>
          <p>A wrong key turns red. Press Backspace and fix it before you can continue.</p>
        </div>
        <div className="how-step">
          <b>3</b>
          <h4>PULL THE ROPE</h4>
          <p>Every correct character pulls your team's side. Get far enough ahead and you win.</p>
        </div>
      </div>
    </div>
  );
}