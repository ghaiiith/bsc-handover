import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Report BS-69: true when the company holds a currently-active subscription.
 * Used to gate the paid product (direct contact with candidates) server-side.
 */
export async function hasActiveEmployerSubscription(userId: string): Promise<boolean> {
  const entitlement = await getActiveEntitlement(userId)
  return entitlement !== null
}

export interface ActiveEntitlement {
  subscriptionId: string
  planId: string | null
  periodEnd: string
  isFree: boolean
}

/**
 * The company's live entitlement, or null. Report BS-99 turns on this being the
 * single source of truth: every activation decision reads it first so paid time
 * is never silently dropped and a free grant can never sit on top of one.
 */
export async function getActiveEntitlement(userId: string): Promise<ActiveEntitlement | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('employer_subscriptions')
    .select('id, plan_id, current_period_end, is_free')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)

  const row = data?.[0]
  if (!row) return null

  return {
    subscriptionId: row.id as string,
    planId: (row.plan_id as string) ?? null,
    periodEnd: row.current_period_end as string,
    isFree: Boolean(row.is_free),
  }
}

export type SubscriptionEventType =
  | 'paid_activation'
  | 'free_grant'
  | 'free_plan'
  | 'blocked_paid_active'
  | 'blocked_no_allowance'

/** Append-only entitlement history (migration 105). Never throws. */
export async function recordSubscriptionEvent(input: {
  userId: string
  subscriptionId?: string | null
  planId?: string | null
  eventType: SubscriptionEventType
  previousPeriodEnd?: string | null
  newPeriodEnd?: string | null
  freeMonthsConsumed?: number
  amount?: number
  note?: string
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('employer_subscription_events').insert({
    user_id: input.userId,
    subscription_id: input.subscriptionId ?? null,
    plan_id: input.planId ?? null,
    event_type: input.eventType,
    previous_period_end: input.previousPeriodEnd ?? null,
    new_period_end: input.newPeriodEnd ?? null,
    free_months_consumed: input.freeMonthsConsumed ?? 0,
    amount: input.amount ?? 0,
    note: input.note ?? null,
  })
  // Audit must never break checkout — log and continue.
  if (error) console.error('[employer-sub] audit write failed:', error.message)
}

/** Create a pending subscription for a company + plan; returns its id. */
export async function createPendingSubscription(
  userId: string,
  planId: string
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('employer_subscriptions')
    .insert({ user_id: userId, plan_id: planId, status: 'pending' })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[employer-sub] create pending failed:', error?.message)
    return null
  }
  return data.id as string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * When does the new period end?
 *
 * A PAID renewal stacks on whatever the company already has, so paying early
 * never burns the remaining days. A free grant or free plan starts from now —
 * it must not inherit paid time it did not buy.
 */
export function computePeriodEnd(
  durationDays: number,
  now: Date,
  existingEnd: string | null,
  stack: boolean
): string {
  const base =
    stack && existingEnd && new Date(existingEnd).getTime() > now.getTime()
      ? new Date(existingEnd)
      : now
  return new Date(base.getTime() + durationDays * DAY_MS).toISOString()
}

export type ActivationMode = 'paid' | 'free_grant' | 'free_plan'

export interface ActivationResult {
  ok: boolean
  userId?: string
  periodEnd?: string
  /** Set when the activation was refused rather than failing technically. */
  blocked?: 'paid_plan_active'
  activeUntil?: string
}

/**
 * Activate a subscription.
 *
 * Report BS-99 changed the rules here:
 *  - `paid` stacks on any remaining entitlement instead of replacing it.
 *  - `free_grant` and `free_plan` are REFUSED while a live paid entitlement
 *    exists, which is what stopped Free -> Pro -> Free -> Pro from minting
 *    months. The caller reports the paid expiry back to the company.
 *  - only after those checks are the company's other active rows expired.
 */
export async function activateSubscription(
  subscriptionId: string,
  options?: {
    mode?: ActivationMode
    /** Report BS-38: activate as a free grant of N months instead of a payment. */
    freeMonths?: number
    amount?: number
  }
): Promise<ActivationResult> {
  const admin = createAdminClient()
  const mode: ActivationMode = options?.mode ?? 'paid'

  const { data: sub } = await admin
    .from('employer_subscriptions')
    .select('id, user_id, plan_id, employer_plans!inner(duration_days, name)')
    .eq('id', subscriptionId)
    .maybeSingle()
  if (!sub) return { ok: false }

  const userId = sub.user_id as string
  const planRaw = sub.employer_plans as
    | { duration_days?: number; name?: string }
    | { duration_days?: number; name?: string }[]
    | undefined
  const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw

  const existing = await getActiveEntitlement(userId)

  // A live PAID entitlement outranks any free activation. Refuse rather than
  // overwrite: the company keeps the days it paid for.
  if (mode !== 'paid' && existing && !existing.isFree) {
    await recordSubscriptionEvent({
      userId,
      subscriptionId,
      planId: sub.plan_id as string,
      eventType: 'blocked_paid_active',
      previousPeriodEnd: existing.periodEnd,
      note: `refused ${mode} while a paid plan is active`,
    })
    return { ok: false, userId, blocked: 'paid_plan_active', activeUntil: existing.periodEnd }
  }

  const freeMonths =
    options?.freeMonths && options.freeMonths > 0 ? Math.floor(options.freeMonths) : 0
  const durationDays = freeMonths > 0 ? freeMonths * 30 : plan?.duration_days ?? 30
  const periodEnd = computePeriodEnd(
    durationDays,
    new Date(),
    existing?.periodEnd ?? null,
    mode === 'paid'
  )

  // Only one plan may be live; safe to do now that the checks above passed.
  await admin
    .from('employer_subscriptions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('id', subscriptionId)

  const { error } = await admin
    .from('employer_subscriptions')
    .update({
      status: 'active',
      current_period_end: periodEnd,
      is_free: mode !== 'paid',
      free_months: freeMonths,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) {
    console.error('[employer-sub] activate failed:', error.message)
    return { ok: false, userId }
  }

  await recordSubscriptionEvent({
    userId,
    subscriptionId,
    planId: sub.plan_id as string,
    eventType:
      mode === 'paid' ? 'paid_activation' : mode === 'free_grant' ? 'free_grant' : 'free_plan',
    previousPeriodEnd: existing?.periodEnd ?? null,
    newPeriodEnd: periodEnd,
    freeMonthsConsumed: freeMonths,
    amount: options?.amount ?? 0,
    note: plan?.name ?? undefined,
  })

  return { ok: true, userId, periodEnd }
}
