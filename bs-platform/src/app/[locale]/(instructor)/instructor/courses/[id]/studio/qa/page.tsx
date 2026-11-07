import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioLessonQaPanel from '@/components/instructor/studio/StudioLessonQaPanel'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import { getStudioLessonQa } from '@/lib/instructor/studio/get-studio-lesson-qa'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ thread?: string }>
}

export default async function StudioLessonQaPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { thread: threadId } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('studio.qa')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  const data = await getStudioLessonQa(id, userId)
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
        <StudioLessonQaPanel
          locale={locale}
          courseId={id}
          threads={data.threads}
          openCount={data.openCount}
          initialThreadId={threadId}
        />
      </div>
    </>
  )
}
