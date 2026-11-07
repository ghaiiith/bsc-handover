import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings } from '@/lib/admin/platform-settings'

/**
 * Report BS-34: a hard daily cap on AI CV generate/edit operations.
 *
 * Unlike the generic durable limiter this fails CLOSED — the point is to bound
 * AI spend, so an infrastructure error must not grant unlimited calls.
 */
const WINDOW_SECONDS = 24 * 60 * 60
export const DEFAULT_CV_DAILY_ALLOWANCE = 2

export interface CvQuotaState {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  /** ISO timestamp when the current 24h window resets. */
  resetsAt: string
}

function bucketFor(userId: string): string {
  return `cv:ai:user:${userId}`
}

/** Resolve the effective allowance: per-account override → global setting → default. */
export async function getCvDailyAllowance(userId: string): Promise<number> {
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('cv_daily_allowance')
    .eq('id', userId)
    .maybeSingle()

  const override = user?.cv_daily_allowance
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return override
  }

  try {
    const settings = await getPlatformSettings()
    const parsed = Number.parseInt(settings.cv_daily_allowance ?? '', 10)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  } catch {
    /* fall through to the default */
  }
  return DEFAULT_CV_DAILY_ALLOWANCE
}

function toState(limit: number, used: number, windowStart: string | null): CvQuotaState {
  const startMs = windowStart ? new Date(windowStart).getTime() : Date.now()
  return {
    allowed: used <= limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: new Date(startMs + WINDOW_SECONDS * 1000).toISOString(),
  }
}

/** Read the current quota WITHOUT consuming an attempt. */
export async function peekCvQuota(userId: string): Promise<CvQuotaState> {
  const limit = await getCvDailyAllowance(userId)
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('peek_rate_limit', {
      p_bucket: bucketFor(userId),
      p_window_seconds: WINDOW_SECONDS,
    })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    return toState(limit, Number(row?.used ?? 0), (row?.window_started_at as string) ?? null)
  } catch (err) {
    console.error('[cv-quota] peek failed:', err)
    return toState(limit, 0, null)
  }
}

/** Consume one attempt. Fails CLOSED when the counter cannot be read. */
export async function consumeCvQuota(userId: string): Promise<CvQuotaState> {
  const limit = await getCvDailyAllowance(userId)
  if (limit === 0) {
    return { allowed: false, limit: 0, used: 0, remaining: 0, resetsAt: new Date().toISOString() }
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('check_rate_limit_detailed', {
      p_bucket: bucketFor(userId),
      p_max: limit,
      p_window_seconds: WINDOW_SECONDS,
    })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    const used = Number(row?.used ?? limit + 1)
    return toState(limit, used, (row?.window_started_at as string) ?? null)
  } catch (err) {
    console.error('[cv-quota] consume failed (failing closed):', err)
    return {
      allowed: false,
      limit,
      used: limit,
      remaining: 0,
      resetsAt: new Date(Date.now() + WINDOW_SECONDS * 1000).toISOString(),
    }
  }
}
