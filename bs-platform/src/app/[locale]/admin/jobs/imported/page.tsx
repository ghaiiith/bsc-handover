import { getLocale } from 'next-intl/server'
import ImportedJobsClient from '@/components/admin/ImportedJobsClient'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function ImportedJobsPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  return <ImportedJobsClient locale={locale} />
}
