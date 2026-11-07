import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { listArticlesForAdmin } from '@/lib/articles/article-actions'
import AdminArticlesManager from '@/components/admin/AdminArticlesManager'

/** Round 9 (BS-105): admin-only article management. */
export default async function AdminArticlesPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)
  const t = await getTranslations('admin_articles')
  const articles = await listArticlesForAdmin()

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <AdminArticlesManager locale={locale} articles={articles} />
    </div>
  )
}

export const metadata = { title: 'Articles — Admin' }
