import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db';

const COOKIE = 'ttw_auth';
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Set it before going live.');
}

export interface AuthUser {
  id: number;
  username: string;
}

/** Read the logged-in user from a raw Cookie header (used by HTTP and Socket.IO). */
export function userFromCookie(header?: string): AuthUser | null {
  if (!header) return null;
  const part = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!part) return null;
  try {
    const p = jwt.verify(decodeURIComponent(part.slice(COOKIE.length + 1)), SECRET) as AuthUser;
    return { id: p.id, username: p.username };
  } catch {
    return null;
  }
}

function setSession(res: Response, user: AuthUser) {
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: MAX_AGE_MS, path: '/' });
}

// very small in-memory rate limit: 10 attempts / 15 min / IP
const attempts = new Map<string, number[]>();
function limited(req: Request): boolean {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 10) {
    attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

export const authRouter = Router();

authRouter.get('/me', (req, res) => {
  res.json({ user: userFromCookie(req.headers.cookie), enabled: !!pool });
});

authRouter.post('/signup', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Accounts are not available right now' });
  if (limited(req)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-16 letters, numbers or _' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be 8-72 characters' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'insert into users (username, username_lower, password_hash) values ($1, $2, $3) returning id, username',
      [username, username.toLowerCase(), hash]
    );
    const user: AuthUser = r.rows[0];
    setSession(res, user);
    res.json({ user });
  } catch (e: any) {
    if (e?.code === '23505') return res.status(409).json({ error: 'That username is taken' });
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

authRouter.post('/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Accounts are not available right now' });
  if (limited(req)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  try {
    const r = await pool.query('select id, username, password_hash from users where username_lower = $1', [username]);
    const row = r.rows[0];
    const ok = row && (await bcrypt.compare(password, row.password_hash));
    if (!ok) return res.status(401).json({ error: 'Wrong username or password' });
    const user: AuthUser = { id: row.id, username: row.username };
    setSession(res, user);
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});
