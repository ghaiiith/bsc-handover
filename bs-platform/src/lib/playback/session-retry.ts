/** Exponential backoff with random jitter to avoid synchronized client retries. */
export function computeBackoffWithJitter(
  attempt: number,
  baseMs: number,
  maxMs = 60_000
): number {
  const capped = Math.min(Math.max(attempt, 1), 10)
  const exponential = baseMs * 2 ** (capped - 1)
  const jitter = Math.random() * baseMs * 0.5
  return Math.min(maxMs, Math.floor(exponential + jitter))
}
