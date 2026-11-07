import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

interface EditRedirectProps {
  params: Promise<{ id: string }>
}

export default async function EditCourseRedirect({ params }: EditRedirectProps) {
  const { id } = await params
  const locale = await getLocale()
  redirect(`/${locale}/instructor/courses/${id}/studio`)
}
