interface RateLimitEntry {
  count: number
  windowStart: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

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

export function checkCouponValidateRateLimit(
  ip: string
): { allowed: true } | { allowed: false } {
  const now = Date.now()
  sweepExpired(now)
  const entry = store.get(ip)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false }
  }

  entry.count += 1
  return { allowed: true }
}
