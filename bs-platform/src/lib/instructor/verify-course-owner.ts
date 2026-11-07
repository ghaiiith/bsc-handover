import { createClient } from '@/lib/supabase/server'

export async function verifyInstructorCourseAccess(
  courseId: string
): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin') || profile.is_active === false) {
    return null
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .single()

  if (!course) return null

  if (course.instructor_id !== user.id && profile.role !== 'admin') {
    return null
  }

  return { userId: user.id }
}
