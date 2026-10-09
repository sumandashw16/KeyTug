import { useCallback, useEffect, useState } from 'react';
import { socket } from '../socket/socket';

export interface User {
  id: number;
  username: string;
}

async function post(path: string, body?: object): Promise<{ user?: User; error?: string }> {
  try {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    return await r.json();
  } catch {
    return { error: 'Could not reach the server' };
  }
}

/** The socket reads the login cookie when it connects, so reconnect after any auth change. */
const reconnect = () => {
  socket.disconnect();
  socket.connect();
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setEnabled(!!d.enabled);
      })
      .catch(() => {});
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    const d = await post('/api/auth/login', { username, password });
    if (!d.user) return d.error ?? 'Login failed';
    setUser(d.user);
    reconnect();
    return null;
  }, []);

  const signup = useCallback(async (username: string, password: string): Promise<string | null> => {
    const d = await post('/api/auth/signup', { username, password });
    if (!d.user) return d.error ?? 'Sign up failed';
    setUser(d.user);
    reconnect();
    return null;
  }, []);

  const logout = useCallback(async () => {
    await post('/api/auth/logout');
    setUser(null);
    reconnect();
  }, []);

  return { user, enabled, login, signup, logout };
}