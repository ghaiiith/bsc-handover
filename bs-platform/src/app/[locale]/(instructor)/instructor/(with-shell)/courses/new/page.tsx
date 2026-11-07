import { getLocale, getTranslations } from 'next-intl/server'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import CreateCourseStarter from '@/components/instructor/CreateCourseStarter'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'

export default async function NewCoursePage() {
  const locale = await getLocale()
  const t = await getTranslations('instructor')
  await requireInstructorAccess(locale)

  return (
    <>
      <PageHeader
        title={t('create_course_title')}
        description={t('create_course_subtitle')}
      />
      <CreateCourseStarter locale={locale} />
    </>
  )
}
