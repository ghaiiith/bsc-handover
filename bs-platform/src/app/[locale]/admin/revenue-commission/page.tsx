import { getLocale } from 'next-intl/server'
import AdminRevenueCommissionDashboard from '@/components/admin/AdminRevenueCommissionDashboard'
import { requireAdminAccess } from '@/lib/admin/require-admin'

export default async function AdminRevenueCommissionPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  return <AdminRevenueCommissionDashboard />
}

export const metadata = { title: 'Revenue & Commission — Admin' }
