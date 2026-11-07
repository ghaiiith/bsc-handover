'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recordCourseCompletionIfEligible } from '@/lib/certificates/completion-actions'

export interface MarkLessonCompleteResult {
  success: boolean
  error?: string
}

export async function markLessonComplete(
  lessonId: string,
  courseId: string,
  locale: string
): Promise<MarkLessonCompleteResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'not_authenticated' }
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single()

  if (lessonError || !lesson) {
    return { success: false, error: 'lesson_not_found' }
  }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isInstructor = course?.instructor_id === user.id
  const isAdmin = profile?.role === 'admin'

  if (!isInstructor && !isAdmin) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (!enrollment) {
      return { success: false, error: 'unauthorized' }
    }
  }

  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  if (!isInstructor && !isAdmin) {
    await recordCourseCompletionIfEligible(user.id, courseId, locale)
  }

  revalidatePath(`/${locale}/dashboard/my-courses`)
  revalidatePath(`/${locale}/dashboard/my-learning`)

  return { success: true }
}
