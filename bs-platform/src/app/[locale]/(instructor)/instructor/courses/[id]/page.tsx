import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

interface ManageCoursePageProps {
  params: Promise<{ id: string }>
}

export default async function ManageCoursePage({ params }: ManageCoursePageProps) {
  const { id } = await params
  const locale = await getLocale()
  redirect(`/${locale}/instructor/courses/${id}/studio`)
}
