import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings } from '@/lib/admin/platform-settings'

/**
 * Report BS-38: free subscription months. A company's own allowance overrides
 * the platform-wide one; whatever it is, it is consumed as it is used, so once
 * the grant runs out the normal price applies again automatically.
 */

export interface FreeMonthsState {
  /** Months granted to this company (per-company override or platform-wide). */
  granted: number
  used: number
  remaining: number
}

export const FREE_MONTH_DAYS = 30

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export async function getFreeMonthsState(userId: string): Promise<FreeMonthsState> {
  const admin = createAdminClient()
  const [{ data: user }, settings] = await Promise.all([
    admin
      .from('users')
      .select('free_subscription_months, free_subscription_months_used')
      .eq('id', userId)
      .maybeSingle(),
    getPlatformSettings(),
  ])

  const override = user?.free_subscription_months
  const granted =
    override === null || override === undefined
      ? toCount(settings.free_subscription_months)
      : toCount(override)
  const used = toCount(user?.free_subscription_months_used)

  return { granted, used, remaining: Math.max(0, granted - used) }
}

/**
 * Consumes `months` from the company's allowance. Re-reads the current usage
 * first so two checkouts in flight cannot both spend the last month.
 */
export async function consumeFreeMonths(
  userId: string,
  months: number
): Promise<{ ok: boolean; consumed: number }> {
  if (months <= 0) return { ok: true, consumed: 0 }

  const state = await getFreeMonthsState(userId)
  const consumed = Math.min(months, state.remaining)
  if (consumed <= 0) return { ok: false, consumed: 0 }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ free_subscription_months_used: state.used + consumed })
    .eq('id', userId)

  if (error) {
    console.error('[free-months] consume failed:', error.message)
    return { ok: false, consumed: 0 }
  }

  return { ok: true, consumed }
}
