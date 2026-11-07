import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getAdminApplications } from '@/lib/admin/admin-application-actions'
import AdminApplicationsTable from '@/components/admin/AdminApplicationsTable'
import { Card, CardContent } from '@/components/ui/card'

// Report BS-66: applications are managed by status by the employer and can only
// be REMOVED here, by an administrator, with a logged reason (privacy requests).
export default async function AdminApplicationsPage() {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)
  const rows = await getAdminApplications()

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('applications')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('applications_hint')}</p>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-4 sm:p-6">
          <AdminApplicationsTable rows={rows} locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Applications — Admin' }
