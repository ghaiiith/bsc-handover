import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Review, Service, ServiceOrder, User } from '@/types'
import { fetchServiceOrderCounts } from '@/lib/services/service-list-stats'
import { normalizeMoneyAmount } from '@/lib/format-number'

export interface ReviewWithReviewer extends Omit<Review, 'reviewer'> {
  reviewer?: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
}

export interface RatingBreakdown {
  stars: Record<1 | 2 | 3 | 4 | 5, number>
  percentages: Record<1 | 2 | 3 | 4 | 5, number>
}

export interface ServiceDetailData {
  service: Service & { portfolio_images: string[] }
  seller: User
  reviews: ReviewWithReviewer[]
  avgRating: number
  reviewCount: number
  orderCount: number
  completedOrderCount: number
  sellerAvgRating: number
  ratingBreakdown: RatingBreakdown
  isLoggedIn: boolean
  isSeller: boolean
  isAdmin: boolean
  userId?: string
  activeOrder?: Pick<ServiceOrder, 'id' | 'status'>
  userHasReviewed: boolean
}

function computeRatingStats(reviews: ReviewWithReviewer[]) {
  const stars: RatingBreakdown['stars'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach((review) => {
    const rating = review.rating as 1 | 2 | 3 | 4 | 5
    if (rating >= 1 && rating <= 5) stars[rating] += 1
  })

  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0

  const percentages: RatingBreakdown['percentages'] = {
    1: reviewCount ? Math.round((stars[1] / reviewCount) * 100) : 0,
    2: reviewCount ? Math.round((stars[2] / reviewCount) * 100) : 0,
    3: reviewCount ? Math.round((stars[3] / reviewCount) * 100) : 0,
    4: reviewCount ? Math.round((stars[4] / reviewCount) * 100) : 0,
    5: reviewCount ? Math.round((stars[5] / reviewCount) * 100) : 0,
  }

  return { avgRating, reviewCount, ratingBreakdown: { stars, percentages } }
}

export async function getServiceDetail(
  serviceId: string
): Promise<ServiceDetailData | null> {
  const supabase = await createClient()

  const { data: serviceRow, error } = await supabase
    .from('services')
    .select(`
      *,
      seller:users!seller_id(id, full_name, full_name_ar, avatar_url, role, bio, bio_ar, is_active, created_at)
    `)
    .eq('id', serviceId)
    .single()

  if (error || !serviceRow) return null

  const sellerRaw = serviceRow.seller
  let seller = Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw

  if (!seller) {
    const { data: sellerRow } = await supabase
      .from('users')
      .select(
        'id, full_name, full_name_ar, avatar_url, role, bio, bio_ar, is_active, created_at'
      )
      .eq('id', (serviceRow as Service).seller_id)
      .maybeSingle()
    seller = sellerRow
  }

  if (!seller) return null

  const { seller: _seller, ...serviceData } = serviceRow as Service & {
    seller: User | null
  }

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id

  let userRole: string | undefined
  if (userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    userRole = profile?.role
  }

  const isSeller = userId === serviceData.seller_id
  const isAdmin = userRole === 'admin'

  if (serviceData.status !== 'active' && !isSeller && !isAdmin) {
    return null
  }

  let activeOrder: ServiceDetailData['activeOrder']
  let userHasReviewed = false

  if (userId) {
    const { data: order } = await supabase
      .from('service_orders')
      .select('id, status')
      .eq('service_id', serviceId)
      .eq('buyer_id', userId)
      .in('status', ['pending', 'in_progress', 'delivered'])
      .maybeSingle()

    if (order) {
      activeOrder = { id: order.id as string, status: order.status }
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('target_type', 'service')
      .eq('target_id', serviceId)
      .maybeSingle()

    userHasReviewed = Boolean(existingReview)
  }

  const { data: reviewsData } = await supabase
    .from('reviews')
    .select(`
      id, reviewer_id, target_type, target_id, rating, comment, created_at,
      reviewer:users(id, full_name, full_name_ar, avatar_url)
    `)
    .eq('target_type', 'service')
    .eq('target_id', serviceId)
    .order('created_at', { ascending: false })

  const reviews: ReviewWithReviewer[] = (reviewsData ?? []).map((row) => {
    const reviewerData = row.reviewer
    const reviewer = Array.isArray(reviewerData) ? reviewerData[0] : reviewerData
    return {
      id: row.id,
      reviewer_id: row.reviewer_id,
      target_type: row.target_type,
      target_id: row.target_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      reviewer: reviewer ?? undefined,
    }
  })

  const orderCounts = await fetchServiceOrderCounts([serviceId])
  const orderCount = orderCounts.get(serviceId) ?? 0

  let completedOrderCount = 0
  try {
    const admin = createAdminClient()
    const { count } = await admin
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .eq('status', 'completed')
    completedOrderCount = count ?? 0
  } catch {
    completedOrderCount = 0
  }

  const { data: sellerServiceIds } = await supabase
    .from('services')
    .select('id')
    .eq('seller_id', serviceData.seller_id)

  const sellerIds = (sellerServiceIds ?? []).map((s) => s.id)
  let sellerAvgRating = 0

  if (sellerIds.length > 0) {
    const { data: sellerReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('target_type', 'service')
      .in('target_id', sellerIds)

    const ratings = (sellerReviews ?? []).map((r) => r.rating as number)
    sellerAvgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 0
  }

  const { avgRating, reviewCount, ratingBreakdown } =
    computeRatingStats(reviews)

  return {
    service: {
      ...serviceData,
      price: normalizeMoneyAmount(serviceData.price),
      portfolio_images: serviceData.portfolio_images ?? [],
    },
    seller: seller as User,
    reviews,
    avgRating,
    reviewCount,
    orderCount: orderCount ?? 0,
    completedOrderCount: completedOrderCount ?? 0,
    sellerAvgRating,
    ratingBreakdown,
    isLoggedIn: Boolean(userId),
    isSeller,
    isAdmin,
    userId,
    activeOrder,
    userHasReviewed,
  }
}
