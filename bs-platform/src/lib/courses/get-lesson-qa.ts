import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { canAccessLessonQa } from '@/lib/courses/lesson-qa-access'
import type { LessonQaThreadWithMessages } from '@/types/lesson-qa'

type RawMessage = {
  id: string
  thread_id: string
  sender_id: string
  sender_role: 'student' | 'instructor'
  content: string
  created_at: string
}

type RawThread = {
  id: string
  lesson_id: string
  course_id: string
  student_id: string
  instructor_id: string
  status: 'open' | 'answered'
  last_message_at: string
  created_at: string
  lesson_qa_messages: RawMessage[]
}

export async function getLessonQaForStudent(
  courseId: string,
  lessonId: string,
  userId: string
): Promise<LessonQaThreadWithMessages | null> {
  const supabase = await createClient()

  const allowed = await canAccessLessonQa(supabase, userId, courseId, lessonId)
  if (!allowed) return null

  const { data, error } = await supabase
    .from('lesson_qa_threads')
    .select(
      `
      id,
      lesson_id,
      course_id,
      student_id,
      instructor_id,
      status,
      last_message_at,
      created_at,
      lesson_qa_messages (
        id,
        thread_id,
        sender_id,
        sender_role,
        content,
        created_at
      )
    `
    )
    .eq('lesson_id', lessonId)
    .eq('course_id', courseId)
    .eq('student_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[lesson-qa] fetch thread failed:', error)
    return null
  }

  if (!data) return null

  const row = data as RawThread
  const messages = (row.lesson_qa_messages ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return {
    id: row.id,
    lesson_id: row.lesson_id,
    course_id: row.course_id,
    student_id: row.student_id,
    instructor_id: row.instructor_id,
    status: row.status,
    last_message_at: row.last_message_at,
    created_at: row.created_at,
    messages,
  }
}
