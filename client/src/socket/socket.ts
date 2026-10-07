import { io, Socket } from 'socket.io-client';

export const socket: Socket = io({ transports: ['websocket'] });

// ---- server clock sync (so both clients start at the same server time) ----
let offset = 0; // serverTime - clientTime
export const serverNow = () => Date.now() + offset;

export async function syncClock(samples = 5): Promise<void> {
  let best = { rtt: Infinity, offset };
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    const serverTime = await new Promise<number | null>((resolve) => {
      socket.timeout(2000).emit('time:sync', (err: Error | null, s: number) => resolve(err ? null : s));
    });
    if (serverTime === null) continue;
    const t1 = Date.now();
    const rtt = t1 - t0;
    if (rtt < best.rtt) best = { rtt, offset: serverTime + rtt / 2 - t1 };
  }
  offset = best.offset;
}

// ---- session persistence (rejoin after refresh) ----
const KEY = 'ttw-session';
export interface Session {
  roomId: string;
  token: string;
}
export const saveSession = (s: Session) => sessionStorage.setItem(KEY, JSON.stringify(s));
export const clearSession = () => sessionStorage.removeItem(KEY);
export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}