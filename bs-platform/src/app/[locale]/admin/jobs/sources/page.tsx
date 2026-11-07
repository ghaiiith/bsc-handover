import { getLocale } from 'next-intl/server'
import JobSourcesClient from '@/components/admin/JobSourcesClient'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function JobSourcesPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  return <JobSourcesClient locale={locale} />
}
