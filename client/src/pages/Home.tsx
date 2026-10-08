import { useEffect, useState } from 'react';
import Rope from '../components/Rope';

interface Props {
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  error: string | null;
}

export default function Home({ onCreate, onJoin, error }: Props) {
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pos, setPos] = useState(50);

  // decorative ambient rope motion
  useEffect(() => {
    const id = setInterval(() => setPos(50 + 22 * Math.sin(Date.now() / 900)), 40);
    return () => clearInterval(id);
  }, []);

  const submit = () => code.trim().length > 0 && onJoin(code.trim().toUpperCase(), name);

  return (
    <div className="screen home">
      <h1 className="title">
        TYPING <span>TUG</span> OF WAR
      </h1>
      <p className="subtitle">Type faster. Stay accurate. Pull harder.</p>

      <div className="home-rope">
        <Rope position={pos} lead={0} showLead={false} />
      </div>

      <input
        className="name-input"
        maxLength={14}
        placeholder="YOUR NAME"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {!joining ? (
        <div className="row">
          <button className="btn primary" onClick={() => onCreate(name)}>CREATE GAME</button>
          <button className="btn" onClick={() => setJoining(true)}>JOIN GAME</button>
        </div>
      ) : (
        <div className="join-box">
          <label>ENTER ROOM CODE</label>
          <input
            className="code-input"
            autoFocus
            maxLength={5}
            placeholder="K7X92"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <div className="row">
            <button className="btn primary" onClick={submit}>JOIN GAME</button>
            <button className="btn" onClick={() => setJoining(false)}>BACK</button>
          </div>
        </div>
      )}

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}