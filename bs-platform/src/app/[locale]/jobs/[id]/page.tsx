import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ChevronRight, MapPin, Briefcase, Calendar } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import { getCompanySlugForUser } from '@/lib/companies/get-public-company'
import { Building2 } from 'lucide-react'
import JobContactSidebar from '@/components/jobs/JobContactSidebar'
import JobContactSection from '@/components/jobs/JobContactSection'
import JobMobileStickyBar from '@/components/jobs/JobMobileStickyBar'
import JobApplyPanel from '@/components/jobs/JobApplyPanel'
import SaveJobButton from '@/components/jobs/SaveJobButton'
import { hasUserApplied } from '@/lib/jobs/applications'
import { isJobSaved } from '@/lib/jobs/saved-jobs'
import JsonLd from '@/components/seo/JsonLd'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getJobDetail } from '@/lib/jobs/get-job-detail'
import {
  formatRelativeDate,
  formatSalaryRange,
  getDaysRemaining,
  getDeadlineUrgency,
  getJobTypeLabel,
  isDeadlinePassed,
  jobTypeStyles,
} from '@/lib/jobs/job-utils'
import { buildPageMetadata, getAppUrl, truncateDescription } from '@/lib/seo/metadata'
import { getSessionProfile } from '@/lib/auth/profile'
import { getDefaultCvProfile, listCvProfiles } from '@/lib/cv/cv-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  remote: 'FULL_TIME',
  internship: 'INTERN',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const isAr = locale === 'ar'
  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('title, title_ar, company_name, description, description_ar, status')
    .eq('id', id)
    .single()

  if (!job || job.status !== 'active') {
    return { title: `Job` }
  }

  const description = isAr ? job.description_ar : job.description

  return buildPageMetadata({
    locale,
    path: `/jobs/${id}`,
    title: isAr
      ? `${job.title_ar} في ${job.company_name}`
      : `${job.title} at ${job.company_name}`,
    description: truncateDescription(description ?? ''),
  })
}

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const tNav = await getTranslations('nav')
  const isAr = locale === 'ar'

  const detail = await getJobDetail(id)
  if (!detail) {
    notFound()
  }

  const session = await getSessionProfile()
  const cvProfiles = session ? await listCvProfiles(session.authUser.id) : []
  const defaultCv = session ? await getDefaultCvProfile(session.authUser.id) : null

  const { job } = detail
  const title = isAr ? job.title_ar : job.title
  // Round 9 (BS-102): only platform-posted jobs have a company account behind them.
  const companySlug =
    !job.is_external && job.posted_by ? await getCompanySlugForUser(job.posted_by) : null
  const description = isAr ? job.description_ar : job.description
  const daysRemaining = getDaysRemaining(job.deadline)
  const urgency = getDeadlineUrgency(daysRemaining)
  const deadlinePassed = isDeadlinePassed(job.deadline)

  const urgencyClass = {
    none: 'text-muted-foreground',
    safe: 'text-emerald-600',
    warning: 'text-amber-600',
    urgent: 'text-destructive',
    passed: 'text-destructive',
  }[urgency]

  const appUrl = getAppUrl()

  const alreadyApplied = session ? await hasUserApplied(job.id) : false
  const jobSaved = session ? await isJobSaved(job.id) : false
  const portfolioSlug = session?.profile?.portfolio_slug
  const portfolioIsPublic = session?.profile?.portfolio_is_public
  // Prefer the student's uploaded CV (report BS-13); fall back to their public
  // portfolio URL.
  const defaultCvUrl =
    session?.profile?.uploaded_cv_url ??
    (portfolioSlug && portfolioIsPublic
      ? `${appUrl}/${locale}/portfolio/${portfolioSlug}`
      : undefined)

  const jobJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: truncateDescription(description ?? ''),
    datePosted: job.created_at,
    validThrough: job.deadline ?? undefined,
    employmentType: EMPLOYMENT_TYPE_MAP[job.job_type] ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city,
        addressCountry: 'IQ',
      },
    },
    url: `${appUrl}/${locale}/jobs/${job.id}`,
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <JsonLd data={jobJsonLd} />
      <Navbar />

      <div className="container mx-auto px-4 py-6 sm:py-8 pb-sticky-mobile max-w-6xl lg:pb-8">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href={`/${locale}`} className="hover:text-foreground">
            {tNav('home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${locale}/jobs`} className="hover:text-foreground">
            {t('browse_title')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground line-clamp-1">{title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          <main className="flex-1 min-w-0 space-y-8">
            <header className="space-y-3 sm:space-y-4">
              {/* Round 9 (BS-102): a platform-posted job links to the company's public page. */}
              {companySlug ? (
                <Link
                  href={`/${locale}/companies/${companySlug}`}
                  className="inline-flex items-center gap-2 text-xl font-bold hover:text-primary sm:text-2xl"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {job.company_name}
                </Link>
              ) : (
                <p className="text-xl font-bold sm:text-2xl">{job.company_name}</p>
              )}
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.city}
                </Badge>
                <Badge className={cn(jobTypeStyles[job.job_type], 'gap-1')} variant="secondary">
                  <Briefcase className="h-3.5 w-3.5" />
                  {getJobTypeLabel(job.job_type, t)}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatRelativeDate(job.created_at, locale)}
                </Badge>
              </div>
            </header>

            <Separator />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('salary_label')}</h2>
              <p className="text-xl font-bold text-primary">
                {formatSalaryRange(job, t('salary_tbd'))}
              </p>
              {job.deadline && (
                <p className={cn('text-sm font-medium', urgencyClass)}>
                  {deadlinePassed
                    ? t('deadline_passed')
                    : t('days_remaining', { count: daysRemaining ?? 0 })}
                </p>
              )}
            </section>

            {job.skills.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('required_skills')}</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('job_description')}</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {description}
              </div>
            </section>

            <Separator />

            <section className="lg:hidden">
              <JobContactSection job={job} locale={locale} />
            </section>

            {session ? (
              <section className="space-y-3 rounded-xl border bg-card p-6">
                {job.is_external ? (
                  // Report BS-62: externally-sourced (Telegram/API) jobs never
                  // receive in-platform applications, so we hide the Apply box and
                  // tell the candidate to use the original contact route.
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    {t('external_apply_notice')}
                  </p>
                ) : !deadlinePassed ? (
                  <>
                    <h2 className="text-lg font-semibold">{t('apply_title')}</h2>
                    <JobApplyPanel
                      jobId={job.id}
                      locale={locale}
                      alreadyApplied={alreadyApplied}
                      defaultCvUrl={defaultCvUrl}
                    />
                  </>
                ) : null}
                <SaveJobButton jobId={job.id} locale={locale} initialSaved={jobSaved} />
              </section>
            ) : null}
          </main>

          <aside className="lg:w-80 shrink-0 hidden lg:block">
            <JobContactSidebar locale={locale} job={job} />
          </aside>
        </div>
      </div>

      <JobMobileStickyBar job={job} />
    </div>
  )
}
