import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import AdminServiceForm from '@/components/admin/AdminServiceForm'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getServiceForEdit } from '@/lib/admin/get-admin-services'

interface AdminEditServicePageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditServicePage({ params }: AdminEditServicePageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('admin')

  await requireAdminAccess(locale)

  const service = await getServiceForEdit(id)
  if (!service) {
    notFound()
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('edit_service')}</h1>
        <p className="text-muted-foreground mt-1">{t('edit_service_subtitle')}</p>
      </div>
      <AdminServiceForm locale={locale} service={service} />
    </div>
  )
}
