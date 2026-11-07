import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export interface DurableRateLimitOptions {
  /** Stable bucket key, e.g. `chat:general:user:<id>` or `cv:analyze:user:<id>`. */
  key: string
  /** Max requests allowed within the window. */
  max: number
  /** Fixed window length in seconds. */
  windowSeconds: number
}

/**
 * Durable, atomic, fixed-window rate limiter backed by the Postgres
 * `check_rate_limit` RPC (migration 029). State is shared across all serverless
 * instances, unlike the previous in-memory limiters.
 *
 * Fails OPEN (allows the request) on infrastructure errors so a transient DB
 * issue never locks legitimate users out — the limiter is defense-in-depth, and
 * the upstream AI providers enforce their own quotas as a backstop.
 */
export async function checkDurableRateLimit({
  key,
  max,
  windowSeconds,
}: DurableRateLimitOptions): Promise<{ allowed: boolean }> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_bucket: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('[rate-limit] check_rate_limit RPC error:', error.message)
      return { allowed: true }
    }

    return { allowed: data === true }
  } catch (err) {
    console.error('[rate-limit] unexpected error:', err)
    return { allowed: true }
  }
}

/** Best-effort client IP extraction from forwarding headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // nginx appends the real peer IP as the LAST entry
    // (proxy_add_x_forwarded_for). Earlier entries are client-supplied and
    // spoofable, so a client can't rotate them to evade IP rate limits.
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
