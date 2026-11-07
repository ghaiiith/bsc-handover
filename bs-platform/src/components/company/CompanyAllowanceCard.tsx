import { getTranslations } from 'next-intl/server'
import { Briefcase, Sparkles, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { getCompanyAllowanceSummary } from '@/lib/subscription/entitlements'

type Summary = Awaited<ReturnType<typeof getCompanyAllowanceSummary>>

/**
 * Round 9 (BS-110): "show the remaining allowance in the company dashboard".
 * Every number here is read from the same entitlement engine the server
 * enforces with, so the company never sees a figure that a request would
 * then contradict.
 */
export default async function CompanyAllowanceCard({
  locale,
  summary,
}: {
  locale: string
  summary: Summary
}) {
  const t = await getTranslations('subscription')
  const isAr = locale === 'ar'
  const { entitlements: ent, jobs, ai } = summary

  const fmt = (used: number, limit: number | null) =>
    limit === null ? t('unlimited_used', { used }) : t('used_of', { used, limit })

  const bar = (used: number, limit: number | null) => {
    if (limit === null) return null
    const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
    return (
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={pct >= 100 ? 'h-full bg-destructive' : 'h-full bg-primary'}
          style={{ width: `${pct}%` }}
        />
      </div>
    )
  }

  const resetDate = ent.period.end.toLocaleDateString(locale)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-base">
          <span>
            {t('your_plan')}: {isAr ? ent.planNameAr : ent.planName}
          </span>
          <span className="text-xs font-normal text-muted-foreground num-en">
            {t('resets_on', { date: resetDate })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Briefcase className="h-4 w-4 text-primary" />
            {t('allowance_jobs')}
          </p>
          <p className="mt-1 num-en text-sm text-muted-foreground">{fmt(jobs.used, jobs.limit)}</p>
          {bar(jobs.used, jobs.limit)}
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('allowance_matching')}
          </p>
          <p className="mt-1 num-en text-sm text-muted-foreground">
            {ai.ai_matching.reason === 'feature_not_included'
              ? t('not_in_plan')
              : fmt(ai.ai_matching.used, ai.ai_matching.limit)}
          </p>
          {ai.ai_matching.reason !== 'feature_not_included' &&
            bar(ai.ai_matching.used, ai.ai_matching.limit)}
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-primary" />
            {t('allowance_hr_chat')}
          </p>
          <p className="mt-1 num-en text-sm text-muted-foreground">
            {ai.hr_chatbot.reason === 'feature_not_included'
              ? t('not_in_plan')
              : fmt(ai.hr_chatbot.used, ai.hr_chatbot.limit)}
          </p>
          {ai.hr_chatbot.reason !== 'feature_not_included' &&
            bar(ai.hr_chatbot.used, ai.hr_chatbot.limit)}
        </div>
      </CardContent>
    </Card>
  )
}
