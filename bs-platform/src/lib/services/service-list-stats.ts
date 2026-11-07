import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ServiceRatingRow {
  target_id: string
  rating: number
}

export async function fetchServiceRatings(
  supabase: SupabaseClient,
  serviceIds: string[]
): Promise<ServiceRatingRow[]> {
  if (serviceIds.length === 0) return []

  const { data } = await supabase
    .from('reviews')
    .select('target_id, rating')
    .eq('target_type', 'service')
    .in('target_id', serviceIds)

  return (data ?? []) as ServiceRatingRow[]
}

export function computeServiceRatingStats(
  serviceId: string,
  ratings: ServiceRatingRow[]
): { avg_rating: number; review_count: number } {
  const serviceRatings = ratings.filter((r) => r.target_id === serviceId)
  const review_count = serviceRatings.length
  const avg_rating =
    review_count > 0
      ? serviceRatings.reduce((sum, r) => sum + r.rating, 0) / review_count
      : 0

  return { avg_rating, review_count }
}

/** Order counts require service role — RLS blocks public reads on service_orders. */
export async function fetchServiceOrderCounts(
  serviceIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (serviceIds.length === 0) return counts

  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('service_orders')
      .select('service_id')
      .in('service_id', serviceIds)

    ;(data ?? []).forEach((row) => {
      const id = row.service_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    })
  } catch (err) {
    console.warn('[services] Could not fetch order counts:', err)
  }

  return counts
}
