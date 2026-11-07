import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ExternalLink, FileText, Sparkles, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getJobRecommendations } from '@/lib/candidates/recommend-for-job'
import MessageButton from '@/components/messaging/MessageButton'
import { consumeAiAllowance, type AllowanceResult } from '@/lib/subscription/entitlements'

/**
 * Round 9 (BS-109): on the Free plan the suggested-people panel is shown
 * BLURRED with an upgrade prompt, and the paid ranking service is never called.
 * The blurred rows are non-identifying placeholders on purpose — a CSS blur is
 * trivially removed, so real names must never reach a browser that has not
 * paid for them.
 */
function BlurredCandidates({ locale, t }: { locale: string; t: (k: string) => string }) {
  return (
    <div className="relative">
      <div aria-hidden className="space-y-3 select-none blur-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="h-4 w-40 rounded bg-foreground/20" />
                <div className="h-3 w-56 rounded bg-foreground/10" />
                <div className="h-3 w-24 rounded bg-foreground/10" />
              </div>
              <Badge variant="secondary" className="num-en shrink-0">
                {[92, 87, 81][i]}%
              </Badge>
            </div>
            <div className="mt-2 h-3 w-64 rounded bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-lg border border-primary/30 bg-background/95 p-4 text-center text-sm shadow-lg backdrop-blur">
          <p className="font-medium">{t('pro_locked_title')}</p>
          <p className="mt-1 text-muted-foreground">{t('pro_locked_hint')}</p>
          <Link
            href={`/${locale}/dashboard/subscription`}
            className="mt-3 inline-block font-semibold text-primary hover:underline"
          >
            {t('pro_locked_cta')} →
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Report BS-39: the ranked shortlist shown inside the employer's job card.
 * Each row carries the score, the reason for the match, and links to the
 * candidate's portfolio and CV.
 */
export default async function RecommendedCandidates({
  jobId,
  locale,
  locked = false,
  companyUserId,
  allowance,
}: {
  jobId: string
  locale: string
  /** Report BS-49/54: matching gated behind Pro and this company isn't Pro. */
  locked?: boolean
  /** Round 9: when given, one allowance unit is consumed per ranking run. */
  companyUserId?: string
  allowance?: AllowanceResult
}) {
  const t = await getTranslations('job_recommendations')

  const header = (
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <Sparkles className="h-4 w-4 text-primary" />
        {t('title')}
      </CardTitle>
    </CardHeader>
  )

  // Round 9 (BS-109): feature not in the plan → blurred placeholders + upgrade,
  // and NO call to the paid ranking service.
  if (locked || allowance?.reason === 'feature_not_included') {
    return (
      <Card>
        {header}
        <CardContent>
          <BlurredCandidates locale={locale} t={t} />
        </CardContent>
      </Card>
    )
  }

  // Round 9 (BS-107): monthly allowance spent → say so, with the numbers.
  if (allowance?.reason === 'limit_reached') {
    return (
      <Card>
        {header}
        <CardContent>
          <div className="rounded-lg border border-amber-400/40 bg-amber-50/50 p-4 text-center text-sm dark:bg-amber-950/20">
            <p className="font-medium">{t('limit_reached_title')}</p>
            <p className="mt-1 num-en text-muted-foreground">
              {t('limit_reached_hint', { used: allowance.used, limit: allowance.limit ?? 0 })}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Meter the run (BS-107). A refusal here means a concurrent request spent
  // the last unit — show the limit state rather than ranking for free.
  if (companyUserId) {
    const spent = await consumeAiAllowance(companyUserId, 'ai_matching')
    if (!spent.allowed) {
      return (
        <Card>
          {header}
          <CardContent>
            <div className="rounded-lg border border-amber-400/40 p-4 text-center text-sm">
              <p className="font-medium">{t('limit_reached_title')}</p>
            </div>
          </CardContent>
        </Card>
      )
    }
  }

  // Report BS-81: on failure, fall back to an explicit empty state instead of
  // rendering nothing — a blank area is indistinguishable from "no matches".
  let data: Awaited<ReturnType<typeof getJobRecommendations>>
  try {
    data = await getJobRecommendations(jobId)
  } catch {
    data = { candidates: [], totalPool: 0, isFallback: false, analyzedAt: new Date().toISOString() }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('title')}
        </CardTitle>
        <span className="num-en text-xs text-muted-foreground">
          {t('pool', { count: data.totalPool })}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {data.isFallback ? t('fallback_note') : t('hint')}
        </p>

        {data.candidates.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
            {t('empty')}
          </div>
        ) : (
          data.candidates.map((candidate, index) => (
            <div key={candidate.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <span className="num-en text-muted-foreground">{index + 1}. </span>
                    {candidate.name}
                  </p>
                  {candidate.headline && (
                    <p className="truncate text-sm text-muted-foreground">{candidate.headline}</p>
                  )}
                  {candidate.location && (
                    <p className="truncate text-xs text-muted-foreground">{candidate.location}</p>
                  )}
                </div>
                <Badge
                  variant={candidate.score >= 60 ? 'default' : 'secondary'}
                  className="num-en shrink-0"
                >
                  {candidate.score}%
                </Badge>
              </div>

              {candidate.matchedKeywords.length > 0 && (
                <p className="mt-2 text-xs">
                  <span className="text-muted-foreground">{t('why')}: </span>
                  {candidate.matchedKeywords.join('، ')}
                </p>
              )}
              {candidate.missingKeywords.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('missing')}: {candidate.missingKeywords.join('، ')}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {candidate.profileSlug && (
                  <Link
                    href={`/${locale}/portfolio/${candidate.profileSlug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('view_profile')}
                  </Link>
                )}
                {candidate.cvUrl && (
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    {t('view_cv')}
                  </a>
                )}
                <span className="text-muted-foreground">
                  {candidate.source === 'platform_cv' ? t('source_platform') : t('source_imported')}
                </span>
              </div>

              {/* Report BS-82: a subscribed company can message a candidate who is
                  a platform user (the subscription + opt-out checks run server-side
                  in startConversation). */}
              {candidate.userId && (
                <div className="mt-2">
                  <MessageButton recipientId={candidate.userId} size="sm" label={t('message_candidate')} />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
