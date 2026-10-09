import { useState } from 'react';
import { User } from '../hooks/useAuth';

interface Props {
  user: User | null;
  enabled: boolean;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onSignup: (username: string, password: string) => Promise<string | null>;
  onLogout: () => void;
}

export default function AccountBar({ user, enabled, onLogin, onSignup, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = await (mode === 'login' ? onLogin : onSignup)(username, password);
    setBusy(false);
    if (err) setError(err);
    else {
      setOpen(false);
      setPassword('');
    }
  };

  if (!enabled && !user) return null;

  return (
    <>
      <div className="account-bar">
        {user ? (
          <>
            <span>PLAYING AS <b>{user.username}</b></span>
            <button className="link nomargin" onClick={onLogout}>LOG OUT</button>
          </>
        ) : (
          <>
            <span className="muted">Playing as guest</span>
            <button className="btn small" onClick={() => setOpen(true)}>LOG IN / SIGN UP</button>
          </>
        )}
      </div>

      {open && !user && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="card auth-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-tabs">
              <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(null); }}>
                LOG IN
              </button>
              <button className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setError(null); }}>
                SIGN UP
              </button>
            </div>
            <input
              className="auth-input"
              placeholder="USERNAME"
              maxLength={16}
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="PASSWORD"
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            {mode === 'signup' && (
              <p className="hint">3-16 letters, numbers or _ . Password at least 8 characters.</p>
            )}
            {error && <div className="error-text">{error}</div>}
            <button className="btn primary" disabled={busy} onClick={submit}>
              {busy ? 'PLEASE WAIT…' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
            </button>
            <button className="link nomargin" onClick={() => setOpen(false)}>CANCEL</button>
          </div>
        </div>
      )}
    </>
  );
}