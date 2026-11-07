import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import CourseCard from '@/components/courses/CourseCard'
import CoursesFilters from '@/components/courses/CoursesFilters'
import CoursesPagination from '@/components/courses/CoursesPagination'
import CoursesEmptyState from '@/components/courses/CoursesEmptyState'
import CoursesRecommendationsSection from '@/components/recommendations/CoursesRecommendationsSection'
import { getSessionProfile } from '@/lib/auth/profile'
import { hasCompletedOnboarding, parsePreferences } from '@/lib/onboarding/preferences-utils'
import {
  getCachedPublishedCourses,
  hasActiveFilters,
  parseCourseListParams,
} from '@/lib/courses/list-courses'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isAr = locale === 'ar'

  return buildPageMetadata({
    locale,
    path: '/courses',
    title: isAr ? `الكورسات` : `Courses`,
    description: isAr
      ? 'استعرض أفضل الكورسات التعليمية في العراق'
      : 'Browse the best educational courses in Iraq',
  })
}

interface CoursesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('courses')
  const resolvedParams = await searchParams
  const filters = parseCourseListParams(resolvedParams)

  const result = await getCachedPublishedCourses(filters)
  const session = await getSessionProfile()
  const prefs = parsePreferences(session?.profile?.preferences)
  const hasPreferences = hasCompletedOnboarding(prefs)

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('browse_title')}</h1>
          {result.total > 0 && (
            <p className="text-muted-foreground mt-2">
              {t('showing_results', {
                count: result.courses.length,
                total: result.total,
              })}
            </p>
          )}
        </div>

        {session && (
          <CoursesRecommendationsSection
            locale={locale}
            isLoggedIn
            hasPreferences={hasPreferences}
          />
        )}

        {result.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
            {t('load_error')}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full shrink-0 lg:w-64">
              <div className="max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:sticky lg:top-20 rounded-xl border bg-background p-4 shadow-sm">
                <CoursesFilters locale={locale} params={filters} />
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {result.courses.length === 0 ? (
                <CoursesEmptyState
                  locale={locale}
                  showClearFilters={hasActiveFilters(filters)}
                />
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {result.courses.map((course) => (
                      <CourseCard key={course.id} course={course} locale={locale} />
                    ))}
                  </div>

                  <CoursesPagination
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
