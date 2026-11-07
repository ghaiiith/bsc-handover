'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleWishlist(
  courseId: string,
  locale: string
): Promise<{ success: boolean; wished: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, wished: false, error: 'not_authenticated' }
  }

  const { data: existing } = await supabase
    .from('course_wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing) {
    await supabase.from('course_wishlists').delete().eq('id', existing.id)
    revalidatePath(`/${locale}/dashboard/wishlist`)
    revalidatePath(`/${locale}/courses/${courseId}`)
    return { success: true, wished: false }
  }

  const { error } = await supabase.from('course_wishlists').insert({
    user_id: user.id,
    course_id: courseId,
  })

  if (error) {
    return { success: false, wished: false, error: error.message }
  }

  revalidatePath(`/${locale}/dashboard/wishlist`)
  revalidatePath(`/${locale}/courses/${courseId}`)
  return { success: true, wished: true }
}

export async function isCourseWishlisted(courseId: string, userId?: string | null): Promise<boolean> {
  if (!userId) return false
  const supabase = await createClient()
  const { data } = await supabase
    .from('course_wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  return Boolean(data)
}
