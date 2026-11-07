import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getReports } from '@/lib/moderation/reports'
import AdminReportsClient from '@/components/admin/AdminReportsClient'

export default async function AdminReportsPage() {
  const locale = await getLocale()
  const t = await getTranslations('report')
  await requireAdminAccess(locale)

  const reports = await getReports()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin_subtitle')}</p>
      </div>
      <AdminReportsClient locale={locale} initialReports={reports} />
    </div>
  )
}

export const metadata = { title: 'Reports — Admin' }
