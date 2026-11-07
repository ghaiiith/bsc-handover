import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { ChevronRight, BookOpen } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import LeadPopupGate from '@/components/tracking/LeadPopupGate'
import CourseCurriculum from '@/components/courses/CourseCurriculum'
import CourseReviews from '@/components/courses/CourseReviews'
import ShareButtons from '@/components/shared/ShareButtons'
import ReportButton from '@/components/moderation/ReportButton'
import CoursePreviewPlayer from '@/components/courses/CoursePreviewPlayer'
import CourseEnrollSidebar from '@/components/courses/CourseEnrollSidebar'
import StarRating from '@/components/courses/StarRating'
import JsonLd from '@/components/seo/JsonLd'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getCourseCategories } from '@/lib/admin/categories'
import {
  getCourseDetail,
  splitLearningOutcomes,
} from '@/lib/courses/get-course-detail'
import { calculatePrice, getActiveCourseDiscounts } from '@/lib/discounts'
import { formatDate } from '@/lib/utils'
import { getLevelLabel, levelStyles } from '@/components/courses/level-styles'
import { buildPageMetadata, getAppUrl, truncateDescription } from '@/lib/seo/metadata'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CourseLevel } from '@/types'
import CourseRecommendedBanner from '@/components/recommendations/CourseRecommendedBanner'
import { getSessionProfile } from '@/lib/auth/profile'
import { hasCompletedOnboarding, parsePreferences } from '@/lib/onboarding/preferences-utils'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const isAr = locale === 'ar'
  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select('title, title_ar, description, description_ar, thumbnail_url, status')
    .eq('id', id)
    .single()

  if (!course || course.status !== 'published') {
    return { title: `Course` }
  }

  const title = isAr ? course.title_ar : course.title
  const description = isAr
    ? course.description_ar ?? course.description
    : course.description ?? course.description_ar

  return buildPageMetadata({
    locale,
    path: `/courses/${id}`,
    title: `${title}`,
    description: truncateDescription(description ?? ''),
    image: course.thumbnail_url,
  })
}

interface CourseDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('courses')
  const tNav = await getTranslations('nav')
  const isAr = locale === 'ar'

  const detail = await getCourseDetail(id)
  if (!detail) {
    notFound()
  }

  const session = await getSessionProfile()
  const prefs = parsePreferences(session?.profile?.preferences)
  const hasPreferences = hasCompletedOnboarding(prefs)

  const { course, instructor, sections, reviews } = detail
  const [pricing, activeDiscounts] = await Promise.all([
    calculatePrice(course.id).catch(() => null),
    getActiveCourseDiscounts(course.id),
  ])
  const coursePricing = pricing ?? {
    original_price: course.price,
    admin_discount_pct: 0,
    instructor_discount_pct: 0,
    coupon_discount_pct: 0,
    total_discount_pct: 0,
    final_price: course.price,
    savings: 0,
  }
  const title = isAr ? course.title_ar : course.title
  const description = isAr
    ? course.description_ar ?? course.description
    : course.description ?? course.description_ar
  const instructorName = isAr
    ? instructor.full_name_ar ?? instructor.full_name
    : instructor.full_name

  const courseCategories = await getCourseCategories()
  const category = courseCategories.find((c) => c.value === course.category)
  const categoryLabel = category
    ? isAr ? category.label : category.labelEn
    : course.category

  const levelLabel = getLevelLabel(course.level, t)
  const languageLabel =
    course.language === 'ar' ? t('language_ar') : t('language_en')

  const learningOutcomes = (() => {
    const stored = course.learning_outcomes
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    }
    if (description) {
      return splitLearningOutcomes(description).filter(
        (item) => item.trim() !== title.trim() && item.length > 10
      )
    }
    return []
  })()

  const appUrl = getAppUrl()
  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: truncateDescription(description ?? ''),
    provider: {
      '@type': 'Organization',
      name: BRAND_FULL_NAME,
      url: appUrl,
    },
    url: `${appUrl}/${locale}/courses/${course.id}`,
    image: course.thumbnail_url ?? undefined,
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: 'IQD',
    },
    inLanguage: course.language === 'ar' ? 'ar' : 'en',
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <JsonLd data={courseJsonLd} />
      <Navbar />
      {/* Marketing item 6: exit-intent lead capture (admin-switchable). */}
      <LeadPopupGate />

      <div className="container mx-auto px-4 py-6 sm:py-8 pb-sticky-mobile max-w-6xl lg:pb-8">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-foreground">
            {t('home')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <Link href={`/${locale}/courses`} className="hover:text-foreground">
            {tNav('courses')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <Link
            href={`/${locale}/courses?category=${course.category}`}
            className="hover:text-foreground"
          >
            {categoryLabel}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {title}
          </span>
        </nav>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Hero — title & meta first on all screen sizes */}
          <section className="order-1 space-y-3 sm:space-y-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <div className="flex flex-wrap gap-2">
              <Badge className={levelStyles[course.level as CourseLevel]} variant="secondary">
                {levelLabel}
              </Badge>
              <Badge variant="outline">{languageLabel}</Badge>
            </div>

            <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">{title}</h1>

            {session && hasPreferences && (
              <CourseRecommendedBanner courseId={course.id} hasPreferences={hasPreferences} />
            )}

            {description && (
              <p className="text-muted-foreground leading-relaxed line-clamp-3 lg:line-clamp-none">
                {description.slice(0, 300)}
                {description.length > 300 ? '…' : ''}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
              <Link
                href={`/${locale}/courses?category=${course.category}`}
                className="flex items-center gap-2 hover:text-primary"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={instructor.avatar_url ?? ''} />
                  <AvatarFallback>{instructorName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">{t('instructor')}</p>
                  <p className="font-medium">{instructorName}</p>
                </div>
              </Link>

              <Separator orientation="vertical" className="hidden h-8 sm:block" />

              <StarRating
                rating={detail.avgRating}
                showCount
                count={detail.reviewCount}
                size="md"
              />

              <Separator orientation="vertical" className="hidden h-8 sm:block" />

              <span className="text-muted-foreground">
                {t('last_updated')}: {formatDate(course.updated_at, locale)}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              {detail.enrollmentCount} {t('students_enrolled')}
            </p>
          </section>

          {/* Preview + enroll — high priority on mobile, sticky sidebar on desktop */}
          <aside className="order-2 self-start lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <CourseEnrollSidebar
              locale={locale}
              course={course}
              isEnrolled={detail.isEnrolled}
              isInstructor={detail.isInstructor}
              isLoggedIn={Boolean(detail.userId)}
              firstLessonSlug={detail.firstLessonSlug}
              hasPreviewVideo={detail.hasPreviewVideo}
              initialWishlisted={detail.isWishlisted}
              pricing={coursePricing}
              activeDiscounts={activeDiscounts}
              durationMinutes={detail.curriculumDurationMinutes}
              lessonCount={detail.curriculumLessonCount}
            />
          </aside>

          {/* Course body — curriculum, reviews, etc. */}
          <div className="order-3 min-w-0 space-y-8 sm:space-y-10 lg:col-span-2 lg:col-start-1 lg:row-start-2">
            {/* Report BS-98: on desktop the preview is the first thing under the
                course header, at full width of the main column — not a thumbnail
                buried in the sidebar. Rendered ONCE: the sidebar drops its own
                copy at lg and up, so there is never a second video element. */}
            {detail.hasPreviewVideo && (
              <section className="hidden lg:block">
                <CoursePreviewPlayer
                  courseId={course.id}
                  poster={course.thumbnail_url}
                  title={title}
                  className="overflow-hidden rounded-xl border shadow-sm"
                />
              </section>
            )}

            {learningOutcomes.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">{t('what_you_learn')}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {learningOutcomes.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-4">{t('curriculum')}</h2>
              {sections.length > 0 ? (
                <CourseCurriculum
                  locale={locale}
                  courseSlug={course.slug}
                  sections={sections}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t('no_courses')}</p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">{t('reviews')}</h2>
              <Suspense
                fallback={
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                }
              >
                <CourseReviews
                  locale={locale}
                  courseId={course.id}
                  reviews={reviews}
                  avgRating={detail.avgRating}
                  reviewCount={detail.reviewCount}
                  ratingBreakdown={detail.ratingBreakdown}
                  isEnrolled={detail.isEnrolled}
                  isInstructor={detail.isInstructor}
                  hasReviewed={detail.hasReviewed}
                />
              </Suspense>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                <ShareButtons
                  url={`${appUrl}/${locale}/courses/${course.id}`}
                  title={title ?? ''}
                />
                <ReportButton targetType="course" targetId={course.id} />
              </div>
            </section>
          </div>
        </div>
      </div>

    </div>
  )
}
