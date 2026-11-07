import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getAllCourseCategories } from '@/lib/admin/categories'
import AdminCategoriesManager from '@/components/admin/AdminCategoriesManager'

export default async function AdminCategoriesPage() {
  const locale = await getLocale()
  const t = await getTranslations('categories')
  await requireAdminAccess(locale)

  const categories = await getAllCourseCategories()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <AdminCategoriesManager locale={locale} categories={categories} />
    </div>
  )
}

export const metadata = { title: 'Categories — Admin' }
