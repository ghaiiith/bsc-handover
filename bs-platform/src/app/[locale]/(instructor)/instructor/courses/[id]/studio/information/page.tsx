import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioInformationForm from '@/components/instructor/studio/StudioInformationForm'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioInformationPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.information')
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
        <StudioInformationForm locale={locale} course={ctx.course} />
      </div>
    </>
  )
}
