/** Greedy word-wrap. Returns the start offset of every line. */
export function wrapLines(text: string, cols: number): number[] {
  const starts = [0];
  let lineStart = 0;
  let lastSpace = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') lastSpace = i;
    if (i - lineStart + 1 > cols) {
      const breakAt = lastSpace >= lineStart ? lastSpace + 1 : i;
      starts.push(breakAt);
      lineStart = breakAt;
      lastSpace = -1;
    }
  }
  return starts;
}

/** Index of the line containing character offset `pos`. */
export function findLine(starts: number[], pos: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}