import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioCertificatesClient from '@/components/instructor/studio/StudioCertificatesClient'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import { getFinalExamSubmissionsForCourse } from '@/lib/certificates/enrollment-cert-status'
import { createAdminClient } from '@/lib/supabase/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioCertificatesPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.certificates')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  const submissions = await getFinalExamSubmissionsForCourse(id, userId)

  const admin = createAdminClient()
  const [{ count: issuedCount }, { data: instructor }] = await Promise.all([
    admin.from('certificates').select('*', { count: 'exact', head: true }).eq('course_id', id),
    admin
      .from('users')
      .select('full_name, full_name_ar')
      .eq('id', ctx.course.instructor_id)
      .single(),
  ])

  const isAr = locale === 'ar'
  const instructorName = isAr
    ? instructor?.full_name_ar ?? instructor?.full_name ?? ''
    : instructor?.full_name ?? ''

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={ctx.course}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
      />
      <StudioCertificatesClient
        locale={locale}
        course={ctx.course}
        instructorName={instructorName}
        submissions={submissions}
        issuedCount={issuedCount ?? 0}
      />
    </>
  )
}
