import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import AdminBroadcastForm from '@/components/admin/AdminBroadcastForm'

export default async function AdminBroadcastPage() {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('broadcast_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('broadcast_subtitle')}</p>
      </div>
      <AdminBroadcastForm />
    </div>
  )
}

export const metadata = { title: 'Broadcast — Admin' }
