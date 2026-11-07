import { getLocale } from 'next-intl/server'
import VideoProvidersDashboard from '@/components/admin/VideoProvidersDashboard'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function AdminVideoProvidersPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  return <VideoProvidersDashboard />
}

export const metadata = { title: 'Video Providers — Admin' }
