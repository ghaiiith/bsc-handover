import { getLocale, getTranslations } from 'next-intl/server'
import AdminCreateCourseForm from '@/components/admin/AdminCreateCourseForm'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getSelectableInstructors } from '@/lib/admin/admin-course-actions-create'

export default async function AdminCreateCoursePage() {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const instructors = await getSelectableInstructors()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('create_course_for_instructor')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('create_course_for_instructor_hint')}
        </p>
      </div>
      <AdminCreateCourseForm locale={locale} initialInstructors={instructors} />
    </div>
  )
}
