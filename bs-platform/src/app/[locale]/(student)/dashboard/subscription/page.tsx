import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/profile'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import { createAdminClient } from '@/lib/supabase/admin'
import SubscriptionPlans, { type PlanView } from '@/components/company/SubscriptionPlans'
import { getFreeMonthsState } from '@/lib/jobs/employer-free-months'
import { getCompanyAllowanceSummary, parseFeatures } from '@/lib/subscription/entitlements'
import CompanyAllowanceCard from '@/components/company/CompanyAllowanceCard'

export default async function SubscriptionPage() {
  const locale = await getLocale()
  const t = await getTranslations('subscription')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)
  if (session.profile.role !== 'company') redirect(getPersonalizedHomePath(locale))

  const admin = createAdminClient()
  const [{ data: plans }, { data: sub }, freeMonths] = await Promise.all([
    admin
      .from('employer_plans')
      .select('id, name, name_ar, job_quota, price, currency, duration_days, tier, description, description_ar, jobs_per_month, features, ai_limits')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('price', { ascending: true }),
    admin
      .from('employer_subscriptions')
      .select('plan_id, current_period_end')
      .eq('user_id', session.authUser.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getFreeMonthsState(session.authUser.id),
  ])
  // Round 9 (BS-110): the company sees exactly what the server enforces.
  const allowance = await getCompanyAllowanceSummary(session.authUser.id)
  const planViews: PlanView[] = (plans ?? []).map((p) => ({
    ...(p as unknown as PlanView),
    features: parseFeatures((p as { features?: unknown }).features),
  }))

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <CompanyAllowanceCard locale={locale} summary={allowance} />
      <SubscriptionPlans
        plans={planViews}
        currentPlanId={(sub?.plan_id as string) ?? null}
        currentPeriodEnd={(sub?.current_period_end as string) ?? null}
        freeMonthsRemaining={freeMonths.remaining}
      />
    </div>
  )
}

export const metadata = { title: 'Subscription' }
