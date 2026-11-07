import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import CurriculumBuilder from '@/components/instructor/studio/CurriculumBuilder'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioCurriculumPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.curriculum')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={ctx.course}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
      />
      <div className="mt-6">
        <CurriculumBuilder
          locale={locale}
          courseId={id}
          initialSections={ctx.sections}
        />
      </div>
    </>
  )
}
