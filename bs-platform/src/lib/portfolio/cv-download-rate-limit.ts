interface RateLimitEntry {
  count: number
  windowStart: number
}

const WINDOW_MS = 60 * 60 * 1000
const MAX_DOWNLOADS = 10

const store = new Map<string, RateLimitEntry>()

export function checkCvDownloadRateLimit(
  ip: string
): { allowed: true } | { allowed: false } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_DOWNLOADS) {
    return { allowed: false }
  }

  entry.count += 1
  return { allowed: true }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
