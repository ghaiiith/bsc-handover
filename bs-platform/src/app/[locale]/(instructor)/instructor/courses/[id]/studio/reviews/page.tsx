import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioReviewsPanel from '@/components/instructor/studio/StudioReviewsPanel'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext, getStudioReviews } from '@/lib/instructor/studio/get-course-studio-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioReviewsPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.reviews')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  const data = await getStudioReviews(id, userId)
  if (!data) notFound()

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={ctx.course}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
      />
      <div className="mt-6">
        <StudioReviewsPanel
          locale={locale}
          courseId={id}
          reviews={data.reviews}
          averageRating={data.averageRating}
          distribution={data.distribution}
        />
      </div>
    </>
  )
}
