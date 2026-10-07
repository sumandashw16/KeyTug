import { Slot } from '../types';

/**
 * Isolated rope logic. KEEP IN SYNC with server/src/game/logic.ts
 *
 * Position is "percent from the left" (P1 side = 0, P2 side = 100).
 *   start    = 100 - p1Advantage        (30/70 => starts at 70, nearer P2's goal)
 *   position = start - difference * (50 / winningDifference)
 */
export const startPosition = (p1Advantage: number) => 100 - p1Advantage;

export function ropePosition(difference: number, winningDifference: number, p1Advantage: number): number {
  const pos = startPosition(p1Advantage) - difference * (50 / winningDifference);
  return Math.min(100, Math.max(0, pos));
}

export function requiredLead(slot: Slot, winningDifference: number, p1Advantage: number): number {
  const p2Advantage = 100 - p1Advantage;
  const raw = slot === 1 ? (winningDifference * p2Advantage) / 50 : (winningDifference * p1Advantage) / 50;
  return Math.max(1, Math.ceil(raw));
}