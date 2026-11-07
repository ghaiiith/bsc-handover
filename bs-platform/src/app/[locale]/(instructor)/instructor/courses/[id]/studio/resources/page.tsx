import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioResources from '@/components/instructor/studio/StudioResources'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import { getCourseResources } from '@/lib/instructor/studio/studio-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioResourcesPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.resources')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  const resources = await getCourseResources(id, userId)
  const isAr = locale === 'ar'

  const sections = ctx.sections.map((section) => ({
    id: section.id,
    title: isAr ? section.title_ar : section.title,
    lessons: section.lessons.map((lesson) => ({
      id: lesson.id,
      title: isAr ? lesson.title_ar : lesson.title,
    })),
  }))

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={ctx.course}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
      />
      <div className="mt-6">
        <StudioResources
          locale={locale}
          courseId={id}
          initialResources={resources}
          sections={sections}
        />
      </div>
    </>
  )
}
