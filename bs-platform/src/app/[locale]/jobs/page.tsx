import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import JobsFilters from '@/components/jobs/JobsFilters'
import JobsPagination from '@/components/jobs/JobsPagination'
import JobsEmptyState from '@/components/jobs/JobsEmptyState'
import JobsListingClient from '@/components/jobs/JobsListingClient'
import JobsRecommendationsSection from '@/components/recommendations/JobsRecommendationsSection'
import { getSessionProfile } from '@/lib/auth/profile'
import {
  getCachedActiveJobs,
  hasActiveJobFilters,
  parseJobListParams,
} from '@/lib/jobs/list-jobs'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 120

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isAr = locale === 'ar'

  return buildPageMetadata({
    locale,
    path: '/jobs',
    title: isAr ? `الوظائف` : `Jobs`,
    description: isAr
      ? 'اكتشف أحدث فرص العمل في العراق وتواصل مع أصحاب العمل مباشرة'
      : 'Discover the latest job opportunities in Iraq and contact employers directly',
  })
}

interface JobsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const resolvedParams = await searchParams
  const filters = parseJobListParams(resolvedParams)
  const result = await getCachedActiveJobs(filters)
  const session = await getSessionProfile()

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('browse_title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('open_positions', { count: result.total })}
          </p>
        </div>

        {/* Suggested jobs, matching the courses listing. */}
        {session && <JobsRecommendationsSection locale={locale} />}

        {result.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
            {t('load_error')}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full shrink-0 lg:w-64">
              <div className="max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:sticky lg:top-20 rounded-xl border bg-background p-4 shadow-sm">
                <JobsFilters locale={locale} params={filters} />
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {result.jobs.length === 0 ? (
                <JobsEmptyState
                  locale={locale}
                  showClearFilters={hasActiveJobFilters(filters)}
                />
              ) : (
                <>
                  <JobsListingClient
                    locale={locale}
                    jobs={result.jobs}
                  />
                  <JobsPagination
                    locale={locale}
                    params={filters}
                    page={result.page}
                    totalPages={result.totalPages}
                  />
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}
