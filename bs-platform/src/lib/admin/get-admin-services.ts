import { createAdminClient } from '@/lib/supabase/admin'
import type { Service, User } from '@/types'

export type AdminServiceStatusFilter =
  | 'all'
  | 'active'
  | 'paused'
  | 'deleted'
  | 'pending'
  | 'rejected'

export interface AdminServiceRow extends Omit<Service, 'seller'> {
  seller: Pick<User, 'id' | 'full_name' | 'full_name_ar'>
  order_count: number
  avg_rating: number
}

export interface AdminServicesStats {
  active: number
  paused: number
  pending: number
  totalOrders: number
}

export interface AdminServicesParams {
  status?: AdminServiceStatusFilter
  category?: string
  q?: string
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

function fallbackSeller(
  sellerId: string
): Pick<User, 'id' | 'full_name' | 'full_name_ar'> {
  return {
    id: sellerId,
    full_name: 'Business Skills',
    full_name_ar: 'إيدوورك',
  }
}

export async function getAdminServices(
  params: AdminServicesParams = {}
): Promise<{ services: AdminServiceRow[]; stats: AdminServicesStats }> {
  const admin = createAdminClient()

  let query = admin
    .from('services')
    .select('*, seller:users!seller_id(id, full_name, full_name_ar)')
    .order('created_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  if (params.category) {
    query = query.eq('category', params.category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[admin/services] list failed:', error.message)
  }

  let rows = (data ?? [])
    .map((row) => {
      const service = row as Service
      const seller =
        unwrap((row as { seller: User | User[] | null }).seller) ??
        fallbackSeller(service.seller_id)
      return { ...service, seller }
    })

  if (params.q?.trim()) {
    const term = params.q.trim().toLowerCase()
    rows = rows.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.title_ar.includes(term) ||
        s.seller.full_name.toLowerCase().includes(term) ||
        (s.seller.full_name_ar?.includes(term) ?? false)
    )
  }

  const serviceIds = rows.map((s) => s.id)
  const orderCounts = new Map<string, number>()
  const ratings = new Map<string, number[]>()

  if (serviceIds.length > 0) {
    const { data: orders } = await admin
      .from('service_orders')
      .select('service_id')
      .in('service_id', serviceIds)

    ;(orders ?? []).forEach((o) => {
      orderCounts.set(o.service_id as string, (orderCounts.get(o.service_id as string) ?? 0) + 1)
    })

    const { data: reviews } = await admin
      .from('reviews')
      .select('target_id, rating')
      .eq('target_type', 'service')
      .in('target_id', serviceIds)

    ;(reviews ?? []).forEach((r) => {
      const list = ratings.get(r.target_id as string) ?? []
      list.push(r.rating as number)
      ratings.set(r.target_id as string, list)
    })
  }

  const services: AdminServiceRow[] = rows.map((s) => {
    const rs = ratings.get(s.id) ?? []
    return {
      ...s,
      portfolio_images: s.portfolio_images ?? [],
      order_count: orderCounts.get(s.id) ?? 0,
      avg_rating: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    }
  })

  const { count: totalOrders } = await admin
    .from('service_orders')
    .select('*', { count: 'exact', head: true })

  const { count: active } = await admin
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: paused } = await admin
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paused')

  const { count: pending } = await admin
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return {
    services,
    stats: {
      active: active ?? 0,
      paused: paused ?? 0,
      pending: pending ?? 0,
      totalOrders: totalOrders ?? 0,
    },
  }
}

export function parseAdminServicesParams(
  searchParams: Record<string, string | string[] | undefined>
): AdminServicesParams {
  const status = searchParams.status
  const valid = ['all', 'active', 'paused', 'deleted', 'pending', 'rejected']
  return {
    status:
      typeof status === 'string' && valid.includes(status)
        ? (status as AdminServiceStatusFilter)
        : 'all',
    category: typeof searchParams.category === 'string' ? searchParams.category : undefined,
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
  }
}

export async function getServiceForEdit(serviceId: string): Promise<Service | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (error || !data) return null
  return data as Service
}
