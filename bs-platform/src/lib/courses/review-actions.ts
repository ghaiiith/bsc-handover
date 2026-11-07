'use server'

import { revalidatePath } from 'next/cache'
import { revalidateCoursesListingCache } from '@/lib/cache/invalidate-listing-cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function submitCourseReview(
  courseId: string,
  rating: number,
  comment: string | undefined,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'not_authenticated' }
  if (rating < 1 || rating > 5) return { error: 'invalid_rating' }

  const { data: course } = await supabase
    .from('courses')
    .select('id, status, instructor_id')
    .eq('id', courseId)
    .single()

  if (!course || course.status !== 'published') {
    return { error: 'course_not_found' }
  }

  if (course.instructor_id === user.id) {
    return { error: 'own_course' }
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) return { error: 'not_enrolled' }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', user.id)
    .eq('target_type', 'course')
    .eq('target_id', courseId)
    .maybeSingle()

  if (existing) return { error: 'already_reviewed' }

  // reviews are service-role-only (RLS blocks direct inserts); enrollment +
  // not-own-course were verified above, so this write is trusted.
  const { error } = await createAdminClient().from('reviews').insert({
    reviewer_id: user.id,
    target_type: 'course',
    target_id: courseId,
    rating,
    comment: comment?.trim() || null,
  })

  if (error) return { error: error.message }

  revalidateCoursesListingCache()
  revalidatePath(`/${locale}/courses/${courseId}`)
  revalidatePath(`/${locale}/instructor`)
  return { success: true }
}
