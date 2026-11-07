import { getLocale, getTranslations } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { listCommunityCategoriesAdmin } from '@/lib/admin/community-category-actions'
import CommunityCategoriesManager from '@/components/admin/CommunityCategoriesManager'

export default async function AdminCommunityCategoriesPage() {
  const locale = await getLocale()
  const t = await getTranslations('community_categories')
  await requireAdminAccess(locale)

  const categories = await listCommunityCategoriesAdmin()

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <CommunityCategoriesManager locale={locale} categories={categories} />
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Community Categories — Admin' }
