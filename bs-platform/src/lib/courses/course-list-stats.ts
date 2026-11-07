import type { SupabaseClient } from '@supabase/supabase-js'

export interface CourseRatingRow {
  target_id: string
  rating: number
}

export async function fetchCourseRatings(
  supabase: SupabaseClient,
  courseIds: string[]
): Promise<CourseRatingRow[]> {
  if (courseIds.length === 0) return []

  const { data } = await supabase
    .from('reviews')
    .select('target_id, rating')
    .eq('target_type', 'course')
    .in('target_id', courseIds)

  return (data ?? []) as CourseRatingRow[]
}

export function computeCourseRatingStats(
  courseId: string,
  ratings: CourseRatingRow[]
): { avg_rating: number; review_count: number } {
  const courseRatings = ratings.filter((r) => r.target_id === courseId)
  const review_count = courseRatings.length
  const avg_rating =
    review_count > 0
      ? courseRatings.reduce((sum, r) => sum + r.rating, 0) / review_count
      : 0

  return { avg_rating, review_count }
}
