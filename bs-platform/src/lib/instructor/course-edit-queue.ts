import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * Report BS-75: update course-level fields, but when the course is already
 * PUBLISHED, hold the change as `pending_changes` for admin approval instead of
 * mutating the live row — the approved version keeps serving until an admin
 * accepts it. Draft/pending/rejected courses update live as before. Returns
 * whether the edit was queued for review. Ownership must be verified by the
 * caller (RLS also scopes the write to the owner).
 */
export async function updateCourseOrQueue(
  courseId: string,
  fields: Record<string, unknown>
): Promise<{ ok: boolean; pendingReview?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('status, pending_changes')
    .eq('id', courseId)
    .maybeSingle()

  if (!course) return { ok: false, error: 'not_found' }

  if (course.status === 'published') {
    const merged = {
      ...((course.pending_changes as Record<string, unknown> | null) ?? {}),
      ...fields,
    }
    const { error } = await supabase
      .from('courses')
      .update({
        pending_changes: merged,
        pending_review_status: 'pending',
        pending_rejection_reason: null,
        pending_submitted_at: new Date().toISOString(),
      })
      .eq('id', courseId)
    if (error) return { ok: false, error: error.message }
    return { ok: true, pendingReview: true }
  }

  const { error } = await supabase
    .from('courses')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', courseId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, pendingReview: false }
}
