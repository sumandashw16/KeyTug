import { Player, Team } from './types';

export const MIN_DIFF = 5;
export const MAX_DIFF = 10000;
export const MIN_WEIGHT = 0.5;
export const MAX_WEIGHT = 5;

export const clampWinningDifference = (n: number) =>
  Math.min(MAX_DIFF, Math.max(MIN_DIFF, Math.round(n)));

export const clampWeight = (n: number) =>
  Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(n * 10) / 10));

type Scorable = Pick<Player, 'team' | 'weight' | 'progress'>;

/**
 * Team score = sum of (weight * correct characters) of its players.
 * KEEP IN SYNC with client/src/utils/ropeMath.ts
 */
export function teamScore(players: Scorable[], team: Team): number {
  return players.reduce((sum, p) => (p.team === team ? sum + p.weight * p.progress : sum), 0);
}

export function checkWinner(
  players: Scorable[],
  winningDifference: number
): { winner: Team | null; difference: number } {
  const difference = teamScore(players, 1) - teamScore(players, 2);
  const eps = 1e-9;
  if (difference >= winningDifference - eps) return { winner: 1, difference };
  if (-difference >= winningDifference - eps) return { winner: 2, difference };
  return { winner: null, difference };
}