'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import {
  AI_SERVICES,
  parseAiLimits,
  parseFeatures,
  type AiService,
  type PlanFeatures,
} from '@/lib/subscription/entitlements'

const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  ai_matching: false,
  ai_chatbot: 'limited',
  hr_chatbot: false,
  featured_jobs: false,
  email_alerts: false,
}

export interface EmployerPlan {
  id: string
  name: string
  name_ar: string | null
  job_quota: number
  price: number
  currency: string
  duration_days: number
  is_default: boolean
  is_active: boolean
  sort_order: number
  // Round 9 (BS-106/107/109/110/111)
  tier: 'free' | 'professional' | 'enterprise' | null
  description: string | null
  description_ar: string | null
  jobs_per_month: number | null
  features: PlanFeatures
  ai_limits: Partial<Record<AiService, number>>
}

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function listEmployerPlans(): Promise<EmployerPlan[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('employer_plans')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []).map((row) => ({
    ...(row as Omit<EmployerPlan, 'features' | 'ai_limits'>),
    features: parseFeatures((row as { features?: unknown }).features),
    ai_limits: parseAiLimits((row as { ai_limits?: unknown }).ai_limits),
  })) as EmployerPlan[]
}

export interface EmployerPlanInput {
  name: string
  name_ar?: string
  job_quota: number
  price: number
  currency?: string
  duration_days: number
  is_default?: boolean
  is_active?: boolean
  sort_order?: number
  // Round 9
  tier?: 'free' | 'professional' | 'enterprise' | null
  description?: string
  description_ar?: string
  /** null/undefined = unlimited */
  jobs_per_month?: number | null
  features?: Partial<PlanFeatures>
  ai_limits?: Partial<Record<AiService, number | null>>
}

/** The columns the Round-9 entitlement model adds, normalised for storage. */
function entitlementColumns(input: EmployerPlanInput) {
  const features = parseFeatures({ ...DEFAULT_PLAN_FEATURES, ...(input.features ?? {}) })
  const limits: Record<string, number> = {}
  for (const svc of AI_SERVICES) {
    const v = input.ai_limits?.[svc]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) limits[svc] = Math.floor(v)
  }
  const jobsPerMonth =
    input.jobs_per_month === null || input.jobs_per_month === undefined
      ? null
      : Math.max(0, Math.floor(input.jobs_per_month))
  return {
    tier: input.tier ?? null,
    description: input.description?.trim() || null,
    description_ar: input.description_ar?.trim() || null,
    jobs_per_month: jobsPerMonth,
    features,
    ai_limits: limits,
  }
}

/** BS-107: every configuration change is recorded with before/after. */
async function recordPlanEvent(
  eventType: 'plan_created' | 'plan_updated' | 'plan_deleted',
  planId: string | null,
  before: unknown,
  after: unknown
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { error } = await admin.from('employer_plan_events').insert({
    plan_id: planId,
    actor_id: user?.id ?? null,
    event_type: eventType,
    before: before ?? null,
    after: after ?? null,
  })
  if (error) console.error('[employer-plans] audit write failed:', error.message)
}

function validate(input: EmployerPlanInput): string | null {
  if (!input.name?.trim() || input.name.trim().length < 2) return 'name_required'
  if (!Number.isFinite(input.job_quota) || input.job_quota < 0) return 'invalid_quota'
  if (!Number.isFinite(input.price) || input.price < 0) return 'invalid_price'
  if (!Number.isFinite(input.duration_days) || input.duration_days <= 0) return 'invalid_duration'
  return null
}

export async function createEmployerPlan(
  input: EmployerPlanInput,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const invalid = validate(input)
  if (invalid) return { error: invalid }

  const admin = createAdminClient()
  // Only one default plan at a time.
  if (input.is_default) {
    await admin.from('employer_plans').update({ is_default: false }).eq('is_default', true)
  }

  const row = {
    name: input.name.trim(),
    name_ar: input.name_ar?.trim() || null,
    job_quota: Math.floor(input.job_quota),
    price: input.price,
    currency: input.currency?.trim() || 'IQD',
    duration_days: Math.floor(input.duration_days),
    is_default: input.is_default ?? false,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
    ...entitlementColumns(input),
  }
  const { data: created, error } = await admin
    .from('employer_plans')
    .insert(row)
    .select('id')
    .single()

  if (error) return { error: error.message }
  await recordPlanEvent('plan_created', (created?.id as string) ?? null, null, row)
  revalidatePath(`/${locale}/admin/employer-plans`)
  revalidatePath(`/${locale}/dashboard/subscription`)
  return { success: true }
}

export async function updateEmployerPlan(
  id: string,
  input: EmployerPlanInput,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const invalid = validate(input)
  if (invalid) return { error: invalid }

  const admin = createAdminClient()
  if (input.is_default) {
    await admin
      .from('employer_plans')
      .update({ is_default: false })
      .eq('is_default', true)
      .neq('id', id)
  }

  const { data: before } = await admin.from('employer_plans').select('*').eq('id', id).maybeSingle()

  const row = {
    name: input.name.trim(),
    name_ar: input.name_ar?.trim() || null,
    job_quota: Math.floor(input.job_quota),
    price: input.price,
    currency: input.currency?.trim() || 'IQD',
    duration_days: Math.floor(input.duration_days),
    is_default: input.is_default ?? false,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
    ...entitlementColumns(input),
    updated_at: new Date().toISOString(),
  }
  const { error } = await admin.from('employer_plans').update(row).eq('id', id)

  if (error) return { error: error.message }
  await recordPlanEvent('plan_updated', id, before, row)
  revalidatePath(`/${locale}/admin/employer-plans`)
  revalidatePath(`/${locale}/dashboard/subscription`)
  return { success: true }
}

export async function deleteEmployerPlan(
  id: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const { data: before } = await admin.from('employer_plans').select('*').eq('id', id).maybeSingle()
  const { error } = await admin.from('employer_plans').delete().eq('id', id)
  if (error) return { error: error.message }
  await recordPlanEvent('plan_deleted', null, before, null)
  revalidatePath(`/${locale}/admin/employer-plans`)
  return { success: true }
}

// ---- Report BS-38: free subscription months ----

export interface CompanyFreeMonths {
  id: string
  full_name: string
  email: string
  free_subscription_months: number | null
  free_subscription_months_used: number
}

/** Platform-wide default granted to every company that has no override. */
export async function updatePlatformFreeMonths(months: number, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (!Number.isFinite(months) || months < 0 || months > 60) return { error: 'invalid_months' }

  const admin = createAdminClient()
  await admin.from('platform_settings').upsert(
    {
      key: 'free_subscription_months',
      value: String(Math.floor(months)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )

  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/employer-plans`)
  return { success: true }
}

/** Companies matching a name/email search, with their current grant. */
export async function searchCompaniesForFreeMonths(q: string): Promise<CompanyFreeMonths[]> {
  if (!(await verifyAdmin())) return []

  const admin = createAdminClient()
  const term = `%${sanitizeSearchTerm(q)}%`
  const { data } = await admin
    .from('users')
    .select('id, full_name, email, free_subscription_months, free_subscription_months_used')
    .eq('role', 'company')
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .limit(10)

  return (data ?? []) as CompanyFreeMonths[]
}

/**
 * Grant (or clear) one company's free months. `months = null` drops the
 * override so the company follows the platform-wide setting again.
 */
export async function setCompanyFreeMonths(
  userId: string,
  months: number | null,
  locale: string
) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (months !== null && (!Number.isFinite(months) || months < 0 || months > 60)) {
    return { error: 'invalid_months' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ free_subscription_months: months === null ? null : Math.floor(months) })
    .eq('id', userId)
    .eq('role', 'company')

  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/employer-plans`)
  return { success: true }
}

/** Give a company its grant back (e.g. a mistaken activation). */
export async function resetCompanyFreeMonthsUsage(userId: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ free_subscription_months_used: 0 })
    .eq('id', userId)
    .eq('role', 'company')

  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/employer-plans`)
  return { success: true }
}
