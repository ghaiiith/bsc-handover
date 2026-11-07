import type { SupabaseClient } from '@supabase/supabase-js'

export async function canAccessLessonQa(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  lessonId: string
): Promise<boolean> {
  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .maybeSingle()

  if (course?.instructor_id === userId) return true

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'admin') return true

  const { data: lesson } = await supabase
    .from('lessons')
    .select('is_free_preview')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (lesson?.is_free_preview) return true

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', userId)
    .maybeSingle()

  return Boolean(enrollment)
}
