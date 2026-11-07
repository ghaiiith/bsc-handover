import { getLocale } from 'next-intl/server'
import AdminAnalyticsCharts from '@/components/admin/AdminAnalyticsCharts'
import AnalyticsRangeSelector from '@/components/admin/AnalyticsRangeSelector'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getAdminAnalytics,
  parseAnalyticsParams,
} from '@/lib/admin/get-admin-analytics'

interface AdminAnalyticsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AdminAnalyticsPageProps) {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const params = parseAnalyticsParams(resolved)
  const data = await getAdminAnalytics(params)

  return (
    <div className="space-y-6 max-w-7xl">
      <AnalyticsRangeSelector locale={locale} current={params.range ?? '30d'} />
      <AdminAnalyticsCharts data={data} locale={locale} />
    </div>
  )
}

export const metadata = { title: 'Analytics — Admin' }
