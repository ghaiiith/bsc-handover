import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Report BS-15: a company's active job posts are capped by their subscription
 * plan's quota. Returns the effective quota — the active subscription's plan
 * quota, else the default plan's quota, else a safe unlimited fallback when no
 * plan is configured (so posting is never blocked by a mis-seeded install).
 */
export async function getEffectiveJobQuota(userId: string): Promise<number> {
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('employer_subscriptions')
    .select('plan_id, current_period_end, status, employer_plans!inner(job_quota, is_active)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const rawPlan = sub?.employer_plans as
    | { job_quota?: number }
    | { job_quota?: number }[]
    | undefined
  const subPlan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan
  const notExpired =
    !sub?.current_period_end || new Date(sub.current_period_end as string).getTime() > Date.now()
  if (subPlan?.job_quota != null && notExpired) {
    return subPlan.job_quota
  }

  const { data: def } = await admin
    .from('employer_plans')
    .select('job_quota')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle()

  if (def?.job_quota != null) return def.job_quota

  return Number.MAX_SAFE_INTEGER
}

/** Count a company's currently-live (active) job posts. */
export async function countActiveCompanyJobs(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('posted_by', userId)
    .eq('status', 'active')
  return count ?? 0
}
