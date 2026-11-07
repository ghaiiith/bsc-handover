import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types'

export interface MyServiceRow extends Service {
  order_count: number
  avg_rating: number
  review_count: number
}

export interface MyServicesStats {
  totalServices: number
  activeServices: number
  totalOrders: number
  totalEarnings: number
}

export async function getMyServices(userId: string): Promise<{
  services: MyServiceRow[]
  stats: MyServicesStats
}> {
  const supabase = await createClient()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('seller_id', userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  const serviceIds = (services ?? []).map((s) => s.id as string)

  const orderCounts = new Map<string, number>()
  const ratings = new Map<string, number[]>()

  if (serviceIds.length > 0) {
    const { data: orders } = await supabase
      .from('service_orders')
      .select('service_id')
      .in('service_id', serviceIds)

    ;(orders ?? []).forEach((o) => {
      const sid = o.service_id as string
      orderCounts.set(sid, (orderCounts.get(sid) ?? 0) + 1)
    })

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('target_id, rating')
      .eq('target_type', 'service')
      .in('target_id', serviceIds)

    ;(reviewsData ?? []).forEach((r) => {
      const list = ratings.get(r.target_id as string) ?? []
      list.push(r.rating as number)
      ratings.set(r.target_id as string, list)
    })
  }

  const rows: MyServiceRow[] = (services ?? []).map((s) => {
    const rs = ratings.get(s.id as string) ?? []
    return {
      ...(s as Service),
      portfolio_images: s.portfolio_images ?? [],
      order_count: orderCounts.get(s.id as string) ?? 0,
      review_count: rs.length,
      avg_rating: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    }
  })

  const { count: totalOrders } = serviceIds.length
    ? await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .in('service_id', serviceIds)
    : { count: 0 }

  const { data: completedPayments } = serviceIds.length
    ? await supabase
        .from('payments')
        .select('instructor_revenue, financial_snapshot_at, service_order_id, service_orders!inner(service_id)')
        .eq('status', 'completed')
        .not('service_order_id', 'is', null)
    : { data: [] }

  const servicePaymentEarnings = (completedPayments ?? []).reduce((s, p) => {
    if (!p.financial_snapshot_at) return s
    return s + Number(p.instructor_revenue ?? 0)
  }, 0)

  return {
    services: rows,
    stats: {
      totalServices: rows.length,
      activeServices: rows.filter((s) => s.status === 'active').length,
      totalOrders: totalOrders ?? 0,
      totalEarnings: servicePaymentEarnings,
    },
  }
}
