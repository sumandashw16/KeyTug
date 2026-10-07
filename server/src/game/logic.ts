import { Slot } from './types';

export const MIN_ADVANTAGE = 10;
export const MAX_ADVANTAGE = 90;
export const MIN_DIFF = 5;
export const MAX_DIFF = 10000;

export const clampWinningDifference = (n: number) =>
  Math.min(MAX_DIFF, Math.max(MIN_DIFF, Math.round(n)));

export const clampAdvantage = (n: number) =>
  Math.min(MAX_ADVANTAGE, Math.max(MIN_ADVANTAGE, Math.round(n)));

/**
 * Rope model (percent from the left, P1 on the left, P2 on the right):
 *   position = (100 - p1Advantage) - difference * (50 / winningDifference)
 * P1 wins at position <= 0, P2 wins at position >= 100.
 * => P1 needs W * p2Adv / 50, P2 needs W * p1Adv / 50. (50/50 => exactly W.)
 * KEEP IN SYNC with client/src/utils/ropeMath.ts
 */
export function requiredLead(slot: Slot, winningDifference: number, p1Advantage: number): number {
  const p2Advantage = 100 - p1Advantage;
  const raw = slot === 1 ? (winningDifference * p2Advantage) / 50 : (winningDifference * p1Advantage) / 50;
  return Math.max(1, Math.ceil(raw));
}

export function checkWinner(
  p1Progress: number,
  p2Progress: number,
  winningDifference: number,
  p1Advantage: number
): { winner: Slot | null; difference: number } {
  const difference = p1Progress - p2Progress;
  if (difference >= requiredLead(1, winningDifference, p1Advantage)) return { winner: 1, difference };
  if (-difference >= requiredLead(2, winningDifference, p1Advantage)) return { winner: 2, difference };
  return { winner: null, difference };
}