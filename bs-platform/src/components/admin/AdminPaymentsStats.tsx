import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import type { AdminPaymentStats } from '@/lib/admin/get-admin-payments'

interface AdminPaymentsStatsProps {
  stats: AdminPaymentStats
}

export default async function AdminPaymentsStats({
  stats,
}: AdminPaymentsStatsProps) {
  const t = await getTranslations('admin')

  const cards = [
    { title: t('gross_revenue'), value: formatPrice(stats.grossRevenue) },
    { title: t('gateway_expenses'), value: formatPrice(stats.gatewayExpenses) },
    { title: t('net_revenue'), value: formatPrice(stats.netRevenue) },
    { title: t('platform_revenue'), value: formatPrice(stats.platformRevenue) },
    { title: t('instructor_revenue_total'), value: formatPrice(stats.instructorRevenue) },
    { title: t('total_transactions'), value: stats.totalTransactions.toString() },
    { title: t('successful_payments'), value: stats.successfulPayments.toString() },
    { title: t('legacy_payments'), value: stats.legacyPayments.toString() },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
