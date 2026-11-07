import { getLocale, getTranslations } from 'next-intl/server'
import AdminPaymentsFilters from '@/components/admin/AdminPaymentsFilters'
import AdminPaymentsStats from '@/components/admin/AdminPaymentsStats'
import AdminPaymentsTable from '@/components/admin/AdminPaymentsTable'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getAdminPayments,
  getAdminPaymentStats,
  parseAdminPaymentsParams,
} from '@/lib/admin/get-admin-payments'

interface AdminPaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolvedParams = await searchParams
  const filters = parseAdminPaymentsParams(resolvedParams)
  const [stats, payments] = await Promise.all([
    getAdminPaymentStats(filters),
    getAdminPayments(filters),
  ])

  return (
    <div className="space-y-6 max-w-6xl">
      <p className="text-muted-foreground">{t('payments_subtitle')}</p>

      <AdminPaymentsStats stats={stats} />

      <AdminPaymentsFilters locale={locale} filters={filters} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <AdminPaymentsTable locale={locale} payments={payments} />
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Payments — Admin' }
