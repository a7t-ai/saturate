/** Nearest-rank percentile. `sorted` must already be ascending. */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  const i = Math.min(sorted.length, Math.max(1, rank)) - 1;
  return sorted[i]!;
}
