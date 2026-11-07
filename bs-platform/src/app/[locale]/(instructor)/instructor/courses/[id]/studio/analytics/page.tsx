import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioAnalyticsCharts from '@/components/instructor/studio/StudioAnalyticsCharts'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext, getStudioAnalytics } from '@/lib/instructor/studio/get-course-studio-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioAnalyticsPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.analytics')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  const data = await getStudioAnalytics(id, userId)
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
        <StudioAnalyticsCharts data={data} />
      </div>
    </>
  )
}
