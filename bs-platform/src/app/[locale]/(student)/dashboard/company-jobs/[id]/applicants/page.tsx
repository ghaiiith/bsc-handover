import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react'
import { requireCompanyRep } from '@/lib/company/require-company'
import { createAdminClient } from '@/lib/supabase/admin'
import { getJobApplicants } from '@/lib/jobs/applications'
import RecommendedCandidates from '@/components/company/RecommendedCandidates'
import JobHrChatPanel from '@/components/company/JobHrChatPanel'
import { checkAiAllowance } from '@/lib/subscription/entitlements'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import ApplicantManageControls from '@/components/jobs/ApplicantManageControls'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyJobApplicantsPage({ params }: PageProps) {
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const companyUserId = await requireCompanyRep(locale)
  const { id } = await params

  // The applicant list is RLS-protected, but the recommendations panel reads
  // through the service role — so ownership of the job is checked here.
  const { data: job } = await createAdminClient()
    .from('jobs')
    .select('id, posted_by')
    .eq('id', id)
    .maybeSingle()

  if (!job || job.posted_by !== companyUserId) notFound()

  // Round 9 (BS-106/107/109): the plan row decides — feature included? monthly
  // allowance left? — and the panel renders blurred / capped / live accordingly.
  const [matchingAllowance, hrAllowance] = await Promise.all([
    checkAiAllowance(companyUserId, 'ai_matching'),
    checkAiAllowance(companyUserId, 'hr_chatbot'),
  ])

  // BS-100: a failed read must never render as "no applicants" — that is what
  // made a real application look like it had vanished.
  let applicants: Awaited<ReturnType<typeof getJobApplicants>> = []
  let loadFailed = false
  try {
    applicants = await getJobApplicants(id, companyUserId)
  } catch {
    loadFailed = true
  }
  const isAr = locale === 'ar'

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href={`/${locale}/dashboard/company-jobs`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('back_to_jobs')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t('applicants_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loadFailed ? '' : t('applicants_count', { count: applicants.length })}
        </p>
      </div>

      {loadFailed ? (
        <Card className="border-destructive/40">
          <CardContent className="py-12 text-center text-destructive">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-60" />
            <p>{t('applicants_load_failed')}</p>
          </CardContent>
        </Card>
      ) : applicants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>{t('no_applicants')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applicants.map((app) => {
            const name =
              (isAr ? app.applicant?.full_name_ar : app.applicant?.full_name) ||
              app.applicant?.full_name ||
              t('anonymous_applicant')
            return (
              <Card key={app.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{name}</p>
                      {app.applicant?.headline ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {app.applicant.headline}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground num-en">
                        {formatDate(app.applied_at, locale)}
                      </p>
                      {/* Report BS-65: the candidate's expected salary, only if
                          they chose to share it with employers. */}
                      {app.applicant?.expected_salary_public !== false &&
                      app.applicant?.expected_salary_amount ? (
                        <p className="mt-1 text-xs font-medium num-en">
                          {t('expected_salary')}:{' '}
                          {app.applicant.expected_salary_amount.toLocaleString(locale)}{' '}
                          {app.applicant.expected_salary_currency ?? 'IQD'}
                          {' / '}
                          {app.applicant.expected_salary_period === 'yearly'
                            ? t('salary_yearly')
                            : t('salary_monthly')}
                        </p>
                      ) : null}
                    </div>
                    <ApplicantManageControls
                      applicationId={app.id}
                      initialStatus={app.status}
                      initialOutcome={app.contact_outcome}
                      locale={locale}
                    />
                  </div>

                  {app.cover_letter ? (
                    <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                      {app.cover_letter}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={app.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ size: 'sm', variant: 'outline', className: 'gap-1' })}
                    >
                      <FileText className="h-4 w-4" />
                      {t('view_cv')}
                    </a>
                    {app.applicant?.portfolio_slug ? (
                      <Link
                        href={`/${locale}/portfolio/${app.applicant.portfolio_slug}`}
                        className={buttonVariants({ size: 'sm', variant: 'ghost', className: 'gap-1' })}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t('view_portfolio')}
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Round 9 (BS-108): job-scoped HR chatbot — locked on plans without it. */}
      <JobHrChatPanel
        jobId={id}
        access={
          hrAllowance.allowed
            ? 'full'
            : hrAllowance.reason === 'limit_reached'
              ? 'limit_reached'
              : 'feature_not_included'
        }
        allowance={{ used: hrAllowance.used, limit: hrAllowance.limit }}
      />

      {/* Report BS-39: recommended candidates sit BELOW the actual applicants,
          who take priority (they applied). */}
      {/* Report BS-81: never paint nothing — a blank area reads as "broken". */}
      <Suspense
        fallback={
          <div className="h-32 animate-pulse rounded-xl border border-dashed bg-muted/20" />
        }
      >
        <RecommendedCandidates
          jobId={id}
          locale={locale}
          companyUserId={companyUserId}
          allowance={matchingAllowance}
        />
      </Suspense>
    </div>
  )
}
