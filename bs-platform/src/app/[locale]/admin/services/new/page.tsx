import { getLocale, getTranslations } from 'next-intl/server'
import AdminServiceForm from '@/components/admin/AdminServiceForm'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function AdminNewServicePage() {
  const locale = await getLocale()
  const t = await getTranslations('admin')

  await requireAdminAccess(locale)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('create_service')}</h1>
        <p className="text-muted-foreground mt-1">{t('create_service_subtitle')}</p>
      </div>
      <AdminServiceForm locale={locale} />
    </div>
  )
}
