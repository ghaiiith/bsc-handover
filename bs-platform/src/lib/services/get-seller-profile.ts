import { createClient } from '@/lib/supabase/server'
import type { Review, Service, User } from '@/types'
import type { ServiceListItem } from '@/lib/services/list-services'

export interface SellerReview extends Omit<Review, 'reviewer'> {
  reviewer?: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
  service?: Pick<Service, 'id' | 'title' | 'title_ar'>
}

export interface SellerProfileData {
  seller: User
  services: ServiceListItem[]
  reviews: SellerReview[]
  avgRating: number
  completedOrders: number
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export async function getSellerProfile(
  sellerId: string
): Promise<SellerProfileData | null> {
  const supabase = await createClient()

  const { data: seller } = await supabase
    .from('users')
    .select(
      'id, full_name, full_name_ar, avatar_url, role, bio, bio_ar, is_active, created_at, headline, skills, location, availability, portfolio_slug'
    )
    .eq('id', sellerId)
    .single()

  if (!seller) return null

  const { data: servicesRaw } = await supabase
    .from('services')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const serviceIds = (servicesRaw ?? []).map((s) => s.id as string)

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

  const services: ServiceListItem[] = (servicesRaw ?? []).map((s) => {
    const rs = ratings.get(s.id as string) ?? []
    return {
      ...(s as Service),
      portfolio_images: s.portfolio_images ?? [],
      seller: seller as User,
      order_count: orderCounts.get(s.id as string) ?? 0,
      review_count: rs.length,
      avg_rating: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    }
  })

  const { count: completedOrders } = serviceIds.length
    ? await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .in('service_id', serviceIds)
        .eq('status', 'completed')
    : { count: 0 }

  let reviews: SellerReview[] = []
  let avgRating = 0

  if (serviceIds.length > 0) {
    const { data: reviewsRaw } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users(id, full_name, full_name_ar, avatar_url),
        service:services(id, title, title_ar)
      `)
      .eq('target_type', 'service')
      .in('target_id', serviceIds)
      .order('created_at', { ascending: false })
      .limit(5)

    reviews = (reviewsRaw ?? []).map((r) => ({
      ...(r as Review),
      reviewer: unwrap(
        (r as { reviewer: User | User[] | null }).reviewer
      ) ?? undefined,
      service: unwrap(
        (r as { service: Service | Service[] | null }).service
      ) ?? undefined,
    }))

    const allRatings = reviews.map((r) => r.rating)
    if (allRatings.length > 0) {
      avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length
    } else {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_type', 'service')
        .in('target_id', serviceIds)

      const rs = (allReviews ?? []).map((r) => r.rating as number)
      avgRating = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0
    }
  }

  return {
    seller: seller as User,
    services,
    reviews,
    avgRating,
    completedOrders: completedOrders ?? 0,
  }
}
