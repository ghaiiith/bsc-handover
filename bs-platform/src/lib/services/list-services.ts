import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import { normalizeMoneyAmount } from '@/lib/format-number'
import type { User } from '@/types'
import {
  SERVICES_PAGE_SIZE,
  type DeliveryFilter,
  type ServiceSort,
} from '@/lib/services/service-utils'

export interface ServiceListParams {
  page?: number
  q?: string
  category?: string
  priceMin?: number
  priceMax?: number
  delivery?: DeliveryFilter
  sort?: ServiceSort
  /**
   * Bound the number of rows scanned for in-memory-sorted branches
   * (`best_rated` / `most_orders`). Used by preview contexts like the landing
   * page so they don't load the entire active-services table.
   */
  limit?: number
}

export interface ServiceListItem {
  id: string
  seller_id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  price: number
  delivery_days: number
  category: string
  status: 'active' | 'paused' | 'deleted' | 'pending' | 'rejected'
  portfolio_images: string[]
  created_at: string
  updated_at?: string
  seller?: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
  order_count: number
  review_count: number
  avg_rating: number
}

export interface ServiceListResult {
  services: ServiceListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

type RpcServiceRow = {
  id: string
  seller_id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  price: number
  delivery_days: number
  category: string
  status: 'active' | 'paused' | 'deleted'
  portfolio_images?: string[] | null
  created_at: string
  updated_at?: string | null
  seller_user_id?: string | null
  seller_full_name?: string | null
  seller_full_name_ar?: string | null
  seller_avatar_url?: string | null
  calc_avg_rating?: number | null
  calc_review_count?: number | null
  calc_order_count?: number | null
}

function deliveryMax(filter: DeliveryFilter | undefined): number | null {
  if (filter === '3') return 3
  if (filter === '7') return 7
  if (filter === '14') return 14
  return null
}

function mapRpcRow(row: RpcServiceRow): ServiceListItem {
  const sellerId = row.seller_user_id ?? row.seller_id
  return {
    id: row.id,
    seller_id: row.seller_id,
    title: row.title,
    title_ar: row.title_ar,
    description: row.description,
    description_ar: row.description_ar,
    price: normalizeMoneyAmount(row.price),
    delivery_days: row.delivery_days,
    category: row.category,
    status: row.status,
    portfolio_images: row.portfolio_images ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
    seller: sellerId
      ? {
          id: sellerId,
          full_name: row.seller_full_name ?? '',
          full_name_ar: row.seller_full_name_ar ?? undefined,
          avatar_url: row.seller_avatar_url ?? undefined,
        }
      : undefined,
    avg_rating: Number(row.calc_avg_rating ?? 0),
    review_count: Number(row.calc_review_count ?? 0),
    order_count: Number(row.calc_order_count ?? 0),
  }
}

export function parseServiceListParams(
  searchParams: Record<string, string | string[] | undefined>
): ServiceListParams {
  const pageRaw = searchParams.page
  const page =
    typeof pageRaw === 'string' ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1

  const sortRaw = searchParams.sort
  const validSorts: ServiceSort[] = [
    'newest',
    'price_asc',
    'price_desc',
    'best_rated',
    'most_orders',
  ]
  const sort =
    typeof sortRaw === 'string' && validSorts.includes(sortRaw as ServiceSort)
      ? (sortRaw as ServiceSort)
      : 'newest'

  const deliveryRaw = searchParams.delivery
  const validDelivery: DeliveryFilter[] = ['any', '3', '7', '14']
  const delivery =
    typeof deliveryRaw === 'string' &&
    validDelivery.includes(deliveryRaw as DeliveryFilter)
      ? (deliveryRaw as DeliveryFilter)
      : 'any'

  const priceMinRaw = searchParams.priceMin
  const priceMaxRaw = searchParams.priceMax

  return {
    page,
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
    category:
      typeof searchParams.category === 'string'
        ? searchParams.category
        : undefined,
    priceMin:
      typeof priceMinRaw === 'string' ? parseInt(priceMinRaw, 10) : undefined,
    priceMax:
      typeof priceMaxRaw === 'string' ? parseInt(priceMaxRaw, 10) : undefined,
    delivery,
    sort,
  }
}

export function hasActiveServiceFilters(params: ServiceListParams): boolean {
  return Boolean(
    params.q?.trim() ||
      params.category ||
      params.priceMin != null ||
      params.priceMax != null ||
      (params.delivery && params.delivery !== 'any')
  )
}

export async function listActiveServices(
  params: ServiceListParams = {},
  client?: SupabaseClient
): Promise<ServiceListResult> {
  const supabase = client ?? (await createClient())
  const page = params.page ?? 1
  const pageSize = params.limit && params.limit > 0 ? params.limit : SERVICES_PAGE_SIZE
  const sort = params.sort ?? 'newest'
  const term = sanitizeSearchTerm(params.q)

  const { data, error } = await supabase.rpc('get_active_services_page', {
    p_page_size: pageSize,
    p_page: page,
    p_sort: sort,
    p_category: params.category ?? null,
    p_price_min:
      params.priceMin != null && !Number.isNaN(params.priceMin)
        ? params.priceMin
        : null,
    p_price_max:
      params.priceMax != null && !Number.isNaN(params.priceMax)
        ? params.priceMax
        : null,
    p_delivery_max: deliveryMax(params.delivery),
    p_search: term ?? null,
  })

  if (error) {
    return {
      services: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: error.message,
    }
  }

  const payload = (data ?? { total: 0, rows: [] }) as {
    total?: number
    rows?: RpcServiceRow[]
  }

  const total = Number(payload.total ?? 0)
  const services = (payload.rows ?? []).map(mapRpcRow)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    services,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Cached public listing for the /services page. Cookieless anon client so the
 * result is memoizable with `unstable_cache`; only RLS-public data is read.
 */
export function getCachedActiveServices(
  params: ServiceListParams = {}
): Promise<ServiceListResult> {
  return unstable_cache(
    () => listActiveServices(params, createPublicClient()),
    ['active-services', JSON.stringify(params)],
    { revalidate: 60, tags: ['services'] }
  )()
}
