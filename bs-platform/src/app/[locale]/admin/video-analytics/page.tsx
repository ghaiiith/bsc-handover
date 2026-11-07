import { getLocale } from 'next-intl/server'
import VideoAnalyticsDashboard from '@/components/admin/VideoAnalyticsDashboard'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function AdminVideoAnalyticsPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  return <VideoAnalyticsDashboard />
}

export const metadata = { title: 'Video Analytics — Admin' }
