const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS = 20

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

function sweepExpired(now: number) {
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(key)
    }
  }
}

export function checkCommunityAiSearchRateLimit(
  userId: string
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now()
  sweepExpired(now)
  const key = `community-ai-search-${userId}`
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterMs: WINDOW_MS - (now - entry.windowStart),
    }
  }

  entry.count += 1
  return { allowed: true }
}
