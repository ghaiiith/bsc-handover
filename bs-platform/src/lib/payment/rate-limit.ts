/**
 * Per-user fixed-window rate limit for payment initiation.
 * In-memory (resets on server restart / per instance) — mirrors the chat
 * limiter. Replace with a shared store (Upstash/Redis) for strict
 * multi-instance guarantees.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS = 8

const store = new Map<string, RateLimitEntry>()
let lastSweep = Date.now()

function sweepExpired(now: number): void {
  if (now - lastSweep < WINDOW_MS) return
  lastSweep = now
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(key)
    }
  }
}

export function checkPaymentRateLimit(
  userId: string
): { allowed: true } | { allowed: false } {
  const now = Date.now()
  sweepExpired(now)
  const entry = store.get(userId)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(userId, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false }
  }

  entry.count += 1
  return { allowed: true }
}
