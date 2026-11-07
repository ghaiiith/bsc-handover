import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import InstructorCoursesFilters from '@/components/instructor/InstructorCoursesFilters'
import InstructorCoursesTable from '@/components/instructor/InstructorCoursesTable'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import {
  getInstructorCourses,
  parseInstructorCoursesParams,
} from '@/lib/instructor/get-instructor-courses'
import { BookOpen } from 'lucide-react'

interface InstructorCoursesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InstructorCoursesPage({
  searchParams,
}: InstructorCoursesPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('instructor')
  const tCourses = await getTranslations('courses')
  const { userId } = await requireInstructorAccess(locale)

  const resolvedParams = await searchParams
  const filters = parseInstructorCoursesParams(resolvedParams)
  const courses = await getInstructorCourses(userId, filters)

  return (
    <>
      <PageHeader
        title={t('my_courses_title')}
        description={t('my_courses_subtitle', { count: courses.length })}
        actions={
          <Link
            href={`/${locale}/instructor/courses/new`}
            className={cn(buttonVariants(), 'gap-2')}
          >
            <Plus className="h-4 w-4" />
            {tCourses('create_course')}
          </Link>
        }
      />

      <div className="mb-6">
        <InstructorCoursesFilters locale={locale} status={filters.status ?? 'all'} />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('no_courses_title')}
          description={t('no_courses_desc')}
          action={{
            href: `/${locale}/instructor/courses/new`,
            label: t('create_first_course'),
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0 sm:p-0">
            <div className="overflow-x-auto p-4 sm:p-6">
              <InstructorCoursesTable locale={locale} courses={courses} />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
