import { getLocale, getTranslations } from 'next-intl/server'
import AdminJobForm from '@/components/admin/AdminJobForm'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function AdminNewJobPage() {
  const locale = await getLocale()
  const t = await getTranslations('jobs')

  await requireAdminAccess(locale)

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{t('create_job')}</h1>
      <AdminJobForm locale={locale} />
    </div>
  )
}
