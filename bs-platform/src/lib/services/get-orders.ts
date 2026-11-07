import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeMoneyAmount } from '@/lib/format-number'
import {
  getDaysUntilDelivery,
  getDeliveryDeadline,
} from '@/lib/services/service-utils'
import type { OrderStatus, Service, ServiceOrder, User } from '@/types'

export type OrderStatusFilter = OrderStatus | 'all'

export interface OrderRow extends Omit<ServiceOrder, 'service' | 'buyer'> {
  service: Service
  buyer?: Pick<
    User,
    | 'id'
    | 'full_name'
    | 'full_name_ar'
    | 'avatar_url'
    | 'email'
    | 'phone'
    | 'headline'
    | 'location'
    | 'portfolio_slug'
    | 'portfolio_is_public'
  >
  seller?: Pick<
    User,
    | 'id'
    | 'full_name'
    | 'full_name_ar'
    | 'avatar_url'
    | 'email'
    | 'phone'
    | 'headline'
    | 'location'
    | 'portfolio_slug'
    | 'portfolio_is_public'
  >
  hasReviewed?: boolean
}

export interface OrderPaymentSummary {
  amount: number
  status: string
  method: string
  currency: string
  created_at: string
}

export type OrderViewerRole = 'buyer' | 'seller'

export interface ServiceOrderDetail extends OrderRow {
  role: OrderViewerRole
  payment?: OrderPaymentSummary
  daysUntilDelivery: number
  deliveryDeadline: string
  isDeliveryOverdue: boolean
  backHref: string
}

const PARTY_FIELDS =
  'id, full_name, full_name_ar, avatar_url, email, phone, headline, location, portfolio_slug, portfolio_is_public'

export interface OrderStats {
  pending: number
  in_progress: number
  delivered: number
  completed: number
  cancelled: number
  earningsThisMonth: number
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export async function getSellerOrders(
  sellerId: string,
  statusFilter: OrderStatusFilter = 'all'
): Promise<{ orders: OrderRow[]; stats: OrderStats }> {
  // Service-role client: counterparty contact PII (email/phone) is column-locked
  // from the authenticated role (migration 044). Access is authorized here by the
  // `seller_id = sellerId` filter — callers pass the session user's id.
  const supabase = createAdminClient()

  let query = supabase
    .from('service_orders')
    .select(`
      *,
      service:services!service_id(*),
      buyer:users!buyer_id(${PARTY_FIELDS})
    `)
    .eq('seller_id', sellerId)
    // Report BS-55: an order is created BEFORE the buyer pays, so an unpaid
    // (abandoned) checkout must not appear to the seller as real incoming work.
    // Once the webhook completes the payment, payment_id is set and it shows.
    .not('payment_id', 'is', null)
    .order('ordered_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getSellerOrders]', error.message)
    return { orders: [], stats: computeStats([]) }
  }
  const orders = mapOrders(data ?? [])

  const { data: allOrders } = await supabase
    .from('service_orders')
    .select('status, ordered_at, service:services!service_id(price)')
    .eq('seller_id', sellerId)

  const stats = computeStats(allOrders ?? [])

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthPayments } = await supabase
    .from('payments')
    .select('instructor_revenue, financial_snapshot_at, service_orders!inner(seller_id)')
    .eq('status', 'completed')
    .eq('service_orders.seller_id', sellerId)
    .gte('created_at', monthStart.toISOString())
    .not('financial_snapshot_at', 'is', null)

  stats.earningsThisMonth = (monthPayments ?? []).reduce(
    (sum, p) => sum + Number(p.instructor_revenue ?? 0),
    0
  )

  return { orders, stats }
}

export async function getBuyerOrders(
  buyerId: string,
  statusFilter: OrderStatusFilter = 'all'
): Promise<OrderRow[]> {
  // Service-role client: authorized by the `buyer_id = buyerId` filter — callers
  // pass the session user's id (migration 044 column-locks counterparty PII).
  const supabase = createAdminClient()

  let query = supabase
    .from('service_orders')
    .select(`
      *,
      service:services!service_id(*),
      seller:users!seller_id(${PARTY_FIELDS})
    `)
    .eq('buyer_id', buyerId)
    .order('ordered_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getBuyerOrders]', error.message)
    return []
  }
  const orders = mapOrders(data ?? [])

  const serviceIds = orders.map((o) => o.service_id)
  if (serviceIds.length === 0) return orders

  const { data: reviews } = await supabase
    .from('reviews')
    .select('target_id')
    .eq('reviewer_id', buyerId)
    .eq('target_type', 'service')
    .in('target_id', serviceIds)

  const reviewed = new Set((reviews ?? []).map((r) => r.target_id))

  return orders.map((o) => ({
    ...o,
    hasReviewed: reviewed.has(o.service_id),
  }))
}

export async function getServiceOrderDetail(
  orderId: string,
  userId: string,
  locale: string
): Promise<ServiceOrderDetail | null> {
  // Service-role client: the order is fetched by id, then access is enforced
  // below via the explicit `isBuyer || isSeller` check before any data is
  // returned (migration 044 column-locks counterparty PII).
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('service_orders')
    .select(`
      *,
      service:services!service_id(*),
      buyer:users!buyer_id(${PARTY_FIELDS}),
      seller:users!seller_id(${PARTY_FIELDS})
    `)
    .eq('id', orderId)
    .maybeSingle()

  if (error || !row) return null

  const order = mapOrders([row])[0]
  if (!order) return null

  const isBuyer = order.buyer_id === userId
  const isSeller = order.seller_id === userId
  if (!isBuyer && !isSeller) return null

  const role: OrderViewerRole = isBuyer ? 'buyer' : 'seller'
  const backHref = isBuyer
    ? `/${locale}/dashboard/orders/my-orders`
    : `/${locale}/dashboard/orders/incoming`

  let hasReviewed = false
  if (isBuyer) {
    const { data: review } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('target_type', 'service')
      .eq('target_id', order.service_id)
      .maybeSingle()
    hasReviewed = Boolean(review)
  }

  const { data: paymentRow } = await supabase
    .from('payments')
    .select('amount, status, method, currency, created_at')
    .eq('service_order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payment = paymentRow
    ? {
        ...paymentRow,
        amount: normalizeMoneyAmount(paymentRow.amount),
      }
    : undefined

  const daysUntilDelivery = getDaysUntilDelivery(
    order.ordered_at,
    order.service.delivery_days
  )
  const deadline = getDeliveryDeadline(order.ordered_at, order.service.delivery_days)
  const activeStatuses: OrderStatus[] = ['pending', 'in_progress', 'delivered']
  const isDeliveryOverdue =
    activeStatuses.includes(order.status) && daysUntilDelivery < 0

  return {
    ...order,
    service: {
      ...order.service,
      price: normalizeMoneyAmount(order.service.price),
    },
    role,
    payment,
    hasReviewed,
    daysUntilDelivery,
    deliveryDeadline: deadline.toISOString(),
    isDeliveryOverdue,
    backHref,
  }
}

function mapOrders(data: unknown[]): OrderRow[] {
  const rows: OrderRow[] = []

  for (const row of data) {
    const r = row as ServiceOrder & {
      service: Service | Service[] | null
      buyer?: User | User[] | null
      seller?: User | User[] | null
    }
    const service = unwrap(r.service)
    if (!service) continue

    rows.push({
      ...r,
      service,
      buyer: unwrap(r.buyer ?? null) ?? undefined,
      seller: unwrap(r.seller ?? null) ?? undefined,
    })
  }

  return rows
}

function computeStats(
  rows: { status: string; ordered_at: string; service: { price: number } | { price: number }[] | null }[],
): OrderStats {
  const stats: OrderStats = {
    pending: 0,
    in_progress: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
    earningsThisMonth: 0,
  }

  rows.forEach((row) => {
    const st = row.status as OrderStatus
    if (st === 'pending') stats.pending += 1
    else if (st === 'in_progress') stats.in_progress += 1
    else if (st === 'delivered') stats.delivered += 1
    else if (st === 'completed') stats.completed += 1
    else if (st === 'cancelled') stats.cancelled += 1
  })

  return stats
}

export function parseOrderStatusFilter(
  searchParams: Record<string, string | string[] | undefined>
): OrderStatusFilter {
  const raw = searchParams.status
  const valid: OrderStatusFilter[] = [
    'all',
    'pending',
    'in_progress',
    'delivered',
    'completed',
    'cancelled',
  ]
  return typeof raw === 'string' && valid.includes(raw as OrderStatusFilter)
    ? (raw as OrderStatusFilter)
    : 'all'
}
