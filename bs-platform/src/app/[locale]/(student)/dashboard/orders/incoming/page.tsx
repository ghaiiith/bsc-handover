import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import OrderStatusFilterTabs from '@/components/services/OrderStatusFilter'
import SellerOrderCard from '@/components/services/SellerOrderCard'
import { createClient } from '@/lib/supabase/server'
import {
  getSellerOrders,
  parseOrderStatusFilter,
} from '@/lib/services/get-orders'
import { formatPrice } from '@/lib/utils'

interface IncomingOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IncomingOrdersPage({
  searchParams,
}: IncomingOrdersPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const supabase = await createClient()
  const resolved = await searchParams
  const statusFilter = parseOrderStatusFilter(resolved)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { orders, stats } = await getSellerOrders(user.id, statusFilter)

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t('incoming_orders')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 text-sm">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold">{stats.pending}</p>
          <p className="text-muted-foreground text-xs">{t('status_pending')}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold">{stats.in_progress}</p>
          <p className="text-muted-foreground text-xs">{t('status_in_progress')}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold">{stats.delivered}</p>
          <p className="text-muted-foreground text-xs">{t('status_delivered')}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold">{stats.completed}</p>
          <p className="text-muted-foreground text-xs">{t('status_completed')}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center col-span-2 sm:col-span-1">
          <p className="font-bold">{formatPrice(stats.earningsThisMonth)}</p>
          <p className="text-muted-foreground text-xs">{t('earnings_this_month')}</p>
        </div>
      </div>

      <div className="mb-6">
        <OrderStatusFilterTabs
          locale={locale}
          basePath="/dashboard/orders/incoming"
          current={statusFilter}
        />
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t('no_orders')}</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <SellerOrderCard key={order.id} order={order} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
