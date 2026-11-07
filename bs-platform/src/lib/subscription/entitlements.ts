import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveEntitlement } from '@/lib/jobs/employer-subscription'

/**
 * Round 9 (BS-106/107/109/110/111): the single place a company's plan is
 * turned into "what may this account do right now".
 *
 * Everything reads from `employer_plans` — the row the administrator edits —
 * so the dashboard text, the server checks and the company's own allowance
 * display can never disagree. Nothing in the interface grants access; every
 * route that costs money or exposes candidate data calls this module.
 */

export type PlanTier = 'free' | 'professional' | 'enterprise'
export type ChatbotLevel = 'none' | 'limited' | 'full'

/** AI services that can be metered per plan (BS-107). */
export type AiService = 'ai_matching' | 'hr_chatbot' | 'ai_chatbot'
export const AI_SERVICES: AiService[] = ['ai_matching', 'hr_chatbot', 'ai_chatbot']

export interface PlanFeatures {
  ai_matching: boolean
  ai_chatbot: ChatbotLevel
  hr_chatbot: boolean
  featured_jobs: boolean
  email_alerts: boolean
}

export interface CompanyEntitlements {
  planId: string | null
  tier: PlanTier
  planName: string
  planNameAr: string
  price: number
  features: PlanFeatures
  /** null = unlimited */
  jobsPerMonth: number | null
  /** per-service monthly caps; absent = unlimited when enabled */
  aiLimits: Partial<Record<AiService, number>>
  /** Billing window the caps reset on. */
  period: { start: Date; end: Date }
  /** True when this is the default (free) plan rather than a purchase. */
  isDefaultPlan: boolean
}

const DEFAULT_FEATURES: PlanFeatures = {
  ai_matching: false,
  ai_chatbot: 'limited',
  hr_chatbot: false,
  featured_jobs: false,
  email_alerts: false,
}

export function parseFeatures(raw: unknown): PlanFeatures {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const chat = o.ai_chatbot
  return {
    ai_matching: o.ai_matching === true,
    ai_chatbot: chat === 'full' || chat === 'none' ? chat : 'limited',
    hr_chatbot: o.hr_chatbot === true,
    featured_jobs: o.featured_jobs === true,
    email_alerts: o.email_alerts === true,
  }
}

export function parseAiLimits(raw: unknown): Partial<Record<AiService, number>> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Partial<Record<AiService, number>> = {}
  for (const s of AI_SERVICES) {
    const v = o[s]
    const n = typeof v === 'number' ? v : Number.parseInt(String(v ?? ''), 10)
    if (Number.isFinite(n) && n >= 0) out[s] = Math.floor(n)
  }
  return out
}

function tierOf(raw: unknown, isDefault: boolean): PlanTier {
  if (raw === 'professional' || raw === 'enterprise' || raw === 'free') return raw
  return isDefault ? 'free' : 'professional'
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The window usage counters live in. A paid subscription resets on its own
 * billing cycle (the 30 days ending at current_period_end); the free plan
 * resets on the calendar month.
 */
export function resolvePeriod(
  now: Date,
  periodEnd: string | null,
  durationDays: number
): { start: Date; end: Date } {
  if (periodEnd) {
    const end = new Date(periodEnd)
    if (end.getTime() > now.getTime()) {
      return { start: new Date(end.getTime() - durationDays * DAY_MS), end }
    }
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { start, end }
}

interface PlanRow {
  id: string
  name: string
  name_ar: string | null
  price: number | string
  tier: string | null
  is_default: boolean
  duration_days: number | null
  jobs_per_month: number | null
  features: unknown
  ai_limits: unknown
}

const PLAN_SELECT =
  'id, name, name_ar, price, tier, is_default, duration_days, jobs_per_month, features, ai_limits'

export async function getCompanyEntitlements(userId: string): Promise<CompanyEntitlements> {
  const admin = createAdminClient()
  const now = new Date()

  const active = await getActiveEntitlement(userId)
  let plan: PlanRow | null = null

  if (active?.planId) {
    const { data } = await admin
      .from('employer_plans')
      .select(PLAN_SELECT)
      .eq('id', active.planId)
      .maybeSingle()
    plan = (data as PlanRow | null) ?? null
  }

  if (!plan) {
    const { data } = await admin
      .from('employer_plans')
      .select(PLAN_SELECT)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()
    plan = (data as PlanRow | null) ?? null
  }

  if (!plan) {
    // Mis-seeded install: fail closed on paid features, open on the basics.
    return {
      planId: null,
      tier: 'free',
      planName: 'Free',
      planNameAr: 'المجانية',
      price: 0,
      features: DEFAULT_FEATURES,
      jobsPerMonth: 1,
      aiLimits: {},
      period: resolvePeriod(now, null, 30),
      isDefaultPlan: true,
    }
  }

  const isDefaultPlan = !active || active.planId !== plan.id
  return {
    planId: plan.id,
    tier: tierOf(plan.tier, plan.is_default),
    planName: plan.name,
    planNameAr: plan.name_ar ?? plan.name,
    price: Number(plan.price ?? 0),
    features: parseFeatures(plan.features),
    jobsPerMonth: plan.jobs_per_month ?? null,
    aiLimits: parseAiLimits(plan.ai_limits),
    period: resolvePeriod(now, isDefaultPlan ? null : active?.periodEnd ?? null, plan.duration_days ?? 30),
    isDefaultPlan,
  }
}

// ---------------------------------------------------------------------------
// AI usage metering (BS-107)
// ---------------------------------------------------------------------------

export interface AllowanceResult {
  allowed: boolean
  used: number
  /** null = unlimited */
  limit: number | null
  remaining: number | null
  reason?: 'feature_not_included' | 'limit_reached'
  tier: PlanTier
}

function featureEnabled(features: PlanFeatures, service: AiService): boolean {
  if (service === 'ai_matching') return features.ai_matching
  if (service === 'hr_chatbot') return features.hr_chatbot
  return features.ai_chatbot !== 'none'
}

function periodKey(period: { start: Date }): string {
  return period.start.toISOString().slice(0, 10)
}

/** Read-only: may this company use the service right now, and how much is left? */
export async function checkAiAllowance(
  userId: string,
  service: AiService
): Promise<AllowanceResult> {
  const ent = await getCompanyEntitlements(userId)
  const enabled = featureEnabled(ent.features, service)
  const limit = ent.aiLimits[service] ?? null

  const admin = createAdminClient()
  const { data } = await admin
    .from('employer_ai_usage')
    .select('used')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('period_start', periodKey(ent.period))
    .maybeSingle()
  const used = (data?.used as number) ?? 0

  if (!enabled) {
    return { allowed: false, used, limit, remaining: limit === null ? null : Math.max(0, limit - used), reason: 'feature_not_included', tier: ent.tier }
  }
  if (limit !== null && used >= limit) {
    return { allowed: false, used, limit, remaining: 0, reason: 'limit_reached', tier: ent.tier }
  }
  return { allowed: true, used, limit, remaining: limit === null ? null : limit - used, tier: ent.tier }
}

/**
 * Check AND record one use. Call only when the request is actually going to
 * the AI service — a refused call must not burn allowance.
 */
export async function consumeAiAllowance(
  userId: string,
  service: AiService
): Promise<AllowanceResult> {
  const check = await checkAiAllowance(userId, service)
  if (!check.allowed) return check

  const ent = await getCompanyEntitlements(userId)
  const admin = createAdminClient()
  const key = periodKey(ent.period)

  // Upsert-increment. Two concurrent calls may both pass the check and land at
  // limit+1 — acceptable for a soft monthly cap; the next call is refused.
  const { data: row } = await admin
    .from('employer_ai_usage')
    .select('id, used')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('period_start', key)
    .maybeSingle()

  if (row) {
    await admin
      .from('employer_ai_usage')
      .update({ used: (row.used as number) + 1, updated_at: new Date().toISOString() })
      .eq('id', row.id)
  } else {
    await admin
      .from('employer_ai_usage')
      .insert({ user_id: userId, service, period_start: key, used: 1 })
  }

  const used = check.used + 1
  return {
    ...check,
    used,
    remaining: check.limit === null ? null : Math.max(0, check.limit - used),
  }
}

// ---------------------------------------------------------------------------
// Monthly job publishing cap (BS-109/110/111)
// ---------------------------------------------------------------------------

export interface JobAllowance {
  used: number
  limit: number | null
  remaining: number | null
  allowed: boolean
  tier: PlanTier
}

/** Jobs this company PUBLISHED inside the current period. Drafts do not count. */
export async function getJobPublishAllowance(userId: string): Promise<JobAllowance> {
  const ent = await getCompanyEntitlements(userId)
  const admin = createAdminClient()

  const { count } = await admin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('posted_by', userId)
    .in('status', ['active', 'expired', 'closed'])
    .gte('published_at', ent.period.start.toISOString())
    .lt('published_at', ent.period.end.toISOString())

  const used = count ?? 0
  const limit = ent.jobsPerMonth
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    allowed: limit === null || used < limit,
    tier: ent.tier,
  }
}

/** Compact snapshot for the company dashboard (BS-110 "show the remaining allowance"). */
export async function getCompanyAllowanceSummary(userId: string) {
  const [ent, jobs, matching, hr] = await Promise.all([
    getCompanyEntitlements(userId),
    getJobPublishAllowance(userId),
    checkAiAllowance(userId, 'ai_matching'),
    checkAiAllowance(userId, 'hr_chatbot'),
  ])
  return { entitlements: ent, jobs, ai: { ai_matching: matching, hr_chatbot: hr } }
}
