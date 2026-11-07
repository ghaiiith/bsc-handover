import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import AdminCoursesFilters from '@/components/admin/AdminCoursesFilters'
import AdminCoursesTable from '@/components/admin/AdminCoursesTable'
import PendingCourseEditsPanel from '@/components/admin/PendingCourseEditsPanel'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getPendingCourseEdits } from '@/lib/admin/admin-course-actions'
import {
  getAdminCourses,
  getAdminCourseStats,
  parseAdminCoursesParams,
} from '@/lib/admin/get-admin-courses'

interface AdminCoursesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolvedParams = await searchParams
  const filters = parseAdminCoursesParams(resolvedParams)
  const [courses, stats, pendingEdits] = await Promise.all([
    getAdminCourses(filters),
    getAdminCourseStats(),
    getPendingCourseEdits(),
  ])

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('courses')}</h1>
        <Link
          href={`/${locale}/admin/courses/new`}
          className={buttonVariants({ className: 'gap-1' })}
        >
          <Plus className="h-4 w-4" />
          {t('create_course_for_instructor')}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: t('status_published'), value: stats.published },
          { label: t('status_pending'), value: stats.pending },
          { label: t('status_draft'), value: stats.draft },
          { label: t('status_rejected'), value: stats.rejected },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PendingCourseEditsPanel locale={locale} edits={pendingEdits as never} />

      <AdminCoursesFilters locale={locale} status={filters.status ?? 'all'} />

      <Card>
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto p-4 sm:p-6">
            <AdminCoursesTable locale={locale} courses={courses} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Courses — Admin' }
