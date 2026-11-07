import { notFound, redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import { studioSectionPath } from '@/lib/instructor/studio/studio-paths'

interface PageProps {
  params: Promise<{ id: string }>
}

/** Assignments removed from studio — redirect legacy URLs to curriculum. */
export default async function StudioAssignmentsPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  redirect(studioSectionPath(locale, id, 'curriculum'))
}
