import { Player, Room } from './types';

export const clampBotWpm = (n: number) => Math.min(250, Math.max(10, Math.round(n)));
export const clampBotAccuracy = (n: number) => Math.min(100, Math.max(70, Math.round(n)));

/** ms until the bot's next keystroke (randomized rhythm + slow start). */
function keyDelay(bot: Player, sinceGo: number): number {
  const base = 60000 / (bot.botWpm * 5);
  const jitter = 0.55 + Math.random() * 0.9; // mean 1.0
  const ramp = sinceGo < 2500 ? 1 + 0.8 * (1 - sinceGo / 2500) : 1;
  return base * jitter * ramp;
}

/** Call when a countdown begins (needs room.goAt). */
export function resetBots(room: Room): void {
  const goAt = room.goAt ?? Date.now();
  for (const p of room.players) {
    if (p.isBot) p.nextAt = goAt + 150 + Math.random() * 350; // "reaction time"
  }
}

/** Advance every bot up to `now`. Returns true if anything changed. */
export function stepBots(room: Room, now: number): boolean {
  let changed = false;
  const goAt = room.goAt ?? now;
  for (const bot of room.players) {
    if (!bot.isBot) continue;
    let guard = 0;
    while (bot.nextAt <= now && guard++ < 20) {
      const since = Math.max(0, bot.nextAt - goAt);
      if (Math.random() * 100 < 100 - bot.botAccuracy) {
        // mistake: notice it, backspace, retype
        bot.errors += 1;
        bot.nextAt += 200 + Math.random() * 300 + keyDelay(bot, since) * 2;
      } else {
        if (bot.progress < room.text.length) bot.progress += 1;
        bot.nextAt += keyDelay(bot, since);
      }
      changed = true;
    }
  }
  return changed;
}