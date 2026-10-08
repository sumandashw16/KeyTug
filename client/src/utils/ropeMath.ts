import { PublicPlayer, Team } from '../types';

/**
 * Isolated rope logic. KEEP IN SYNC with server/src/game/logic.ts
 *
 * Team score = sum of (weight * correct characters).
 * Position is "percent from the left" (Team A = 0, Team B = 100):
 *   position = 50 - (scoreA - scoreB) * (50 / winningDifference)
 */
type Scorable = Pick<PublicPlayer, 'team' | 'weight' | 'progress'>;

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function teamScore(players: Scorable[], team: Team): number {
  return players.reduce((sum, p) => (p.team === team ? sum + p.weight * p.progress : sum), 0);
}

export function ropePosition(difference: number, winningDifference: number): number {
  const pos = 50 - difference * (50 / winningDifference);
  return Math.min(100, Math.max(0, pos));
}