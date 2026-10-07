export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = Math.max(elapsedMs, 3000) / 60000; // avoid early spikes
  return Math.round(correctChars / 5 / minutes);
}

export function calcAccuracy(correct: number, errors: number): number {
  const total = correct + errors;
  return total === 0 ? 100 : Math.round((correct / total) * 100);
}