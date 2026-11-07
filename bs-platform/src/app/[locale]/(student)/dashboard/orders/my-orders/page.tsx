import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import OrderStatusFilterTabs from '@/components/services/OrderStatusFilter'
import BuyerOrderCard from '@/components/services/BuyerOrderCard'
import { createClient } from '@/lib/supabase/server'
import {
  getBuyerOrders,
  parseOrderStatusFilter,
} from '@/lib/services/get-orders'

interface MyOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MyOrdersPage({ searchParams }: MyOrdersPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const supabase = await createClient()
  const resolved = await searchParams
  const statusFilter = parseOrderStatusFilter(resolved)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const orders = await getBuyerOrders(user.id, statusFilter)

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t('my_orders')}</h1>

      <div className="mb-6">
        <OrderStatusFilterTabs
          locale={locale}
          basePath="/dashboard/orders/my-orders"
          current={statusFilter}
        />
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t('no_orders')}</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <BuyerOrderCard key={order.id} order={order} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
