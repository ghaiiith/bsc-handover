import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import type { LessonQaMessage, StudioLessonQaThreadRow } from '@/types/lesson-qa'

type RawMessage = {
  id: string
  thread_id: string
  sender_id: string
  sender_role: 'student' | 'instructor'
  content: string
  created_at: string
}

type RawStudent = {
  id: string
  full_name: string
  full_name_ar: string | null
  avatar_url: string | null
}

type RawThread = {
  id: string
  status: 'open' | 'answered'
  last_message_at: string
  created_at: string
  lesson_id: string
  student: RawStudent | RawStudent[] | null
  lesson_qa_messages: RawMessage[]
}

function normalizeStudent(
  student: RawStudent | RawStudent[] | null
): RawStudent | null {
  if (!student) return null
  return Array.isArray(student) ? (student[0] ?? null) : student
}

export interface StudioLessonQaData {
  threads: StudioLessonQaThreadRow[]
  openCount: number
}

export async function getStudioLessonQa(
  courseId: string,
  instructorId: string
): Promise<StudioLessonQaData | null> {
  const ctx = await getCourseStudioContext(courseId, instructorId)
  if (!ctx) return null

  const lessonMeta = new Map<
    string,
    {
      title: string
      title_ar: string
      slug: string | null
      lesson_type: string | null
      section_title: string
      section_title_ar: string
    }
  >()

  for (const section of ctx.sections) {
    const sectionTitle = section.title
    const sectionTitleAr = section.title_ar
    for (const lesson of section.lessons ?? []) {
      lessonMeta.set(lesson.id, {
        title: lesson.title,
        title_ar: lesson.title_ar,
        slug: lesson.slug ?? null,
        lesson_type: lesson.lesson_type ?? null,
        section_title: sectionTitle,
        section_title_ar: sectionTitleAr,
      })
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lesson_qa_threads')
    .select(
      `
      id,
      status,
      last_message_at,
      created_at,
      lesson_id,
      student:users!student_id(id, full_name, full_name_ar, avatar_url),
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
    .eq('course_id', courseId)
    .eq('instructor_id', instructorId)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('[studio-lesson-qa] fetch failed:', error)
    return null
  }

  const threads: StudioLessonQaThreadRow[] = []
  let openCount = 0

  for (const row of data ?? []) {
    const student = normalizeStudent((row as RawThread).student)
    if (row.status === 'open') openCount += 1

    const meta = lessonMeta.get(row.lesson_id)
    if (!meta || !student) continue

    const messages = [...((row as RawThread).lesson_qa_messages ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const lastStudentMessage = [...messages]
      .reverse()
      .find((m) => m.sender_role === 'student') as LessonQaMessage | undefined

    threads.push({
      id: row.id,
      status: row.status as 'open' | 'answered',
      last_message_at: row.last_message_at,
      created_at: row.created_at,
      student: {
        id: student.id,
        full_name: student.full_name,
        full_name_ar: student.full_name_ar,
        avatar_url: student.avatar_url,
      },
      lesson: {
        id: row.lesson_id,
        ...meta,
      },
      messages,
      lastStudentMessage,
    })
  }

  return { threads, openCount }
}

export async function getStudioLessonQaThread(
  courseId: string,
  instructorId: string,
  threadId: string
): Promise<StudioLessonQaThreadRow | null> {
  const data = await getStudioLessonQa(courseId, instructorId)
  if (!data) return null
  return data.threads.find((t) => t.id === threadId) ?? null
}
