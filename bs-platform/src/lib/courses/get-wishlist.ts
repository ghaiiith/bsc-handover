import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CourseListItem } from '@/lib/courses/list-courses'

export interface WishlistCourse {
  wishlistId: string
  addedAt: string
  course: CourseListItem
}

export async function getUserWishlist(userId: string): Promise<WishlistCourse[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('course_wishlists')
    .select(
      `id, created_at,
       courses(
         id, title, title_ar, thumbnail_url, price, category, level, language,
         total_lessons, total_duration_minutes, status,
         instructor:users(full_name, full_name_ar, avatar_url)
       )`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const items: WishlistCourse[] = []

  for (const row of data ?? []) {
    const course = row.courses as unknown as CourseListItem & { status: string } | null
    if (!course || course.status !== 'published') continue
    items.push({
      wishlistId: row.id as string,
      addedAt: row.created_at as string,
      course,
    })
  }

  return items
}
