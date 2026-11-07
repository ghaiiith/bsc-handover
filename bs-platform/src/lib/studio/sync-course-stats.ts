import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/** Recomputes total_lessons and total_duration_minutes from lesson rows. */
export async function syncCourseLessonStats(courseId: string): Promise<void> {
  const db = createAdminClient()

  const { data: lessons } = await db
    .from('lessons')
    .select('duration_minutes')
    .eq('course_id', courseId)

  const total_lessons = lessons?.length ?? 0
  const total_duration_minutes = (lessons ?? []).reduce(
    (sum, row) => sum + (row.duration_minutes as number),
    0
  )

  await db
    .from('courses')
    .update({ total_lessons, total_duration_minutes })
    .eq('id', courseId)
}
