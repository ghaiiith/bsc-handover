import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import EnrolledCourseCard from '@/components/courses/EnrolledCourseCard'
import MyCoursesEmptyState from '@/components/courses/MyCoursesEmptyState'
import { getMyEnrollments } from '@/lib/courses/get-my-enrollments'

export default async function MyCoursesPage() {
  const locale = await getLocale()
  const t = await getTranslations('courses')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const enrollments = await getMyEnrollments(user.id)

  return (
    <>
      <div className="mb-8">
          <h1 className="text-2xl font-bold">{t('my_courses')}</h1>
          <p className="text-muted-foreground mt-1">
            {enrollments.length > 0
              ? t('enrolled_count', { count: enrollments.length })
              : t('no_enrollments_subtitle')}
          </p>
        </div>

        {enrollments.length === 0 ? (
          <MyCoursesEmptyState locale={locale} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {enrollments.map((item) => (
              <EnrolledCourseCard
                key={item.enrollmentId}
                item={item}
                locale={locale}
              />
            ))}
          </div>
        )}
    </>
  )
}
