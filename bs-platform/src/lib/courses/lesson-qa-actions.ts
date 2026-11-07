'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canAccessLessonQa } from '@/lib/courses/lesson-qa-access'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import { studioSectionPath } from '@/lib/instructor/studio/studio-paths'
import {
  notifyInstructorOfLessonQuestion,
  notifyStudentOfLessonAnswer,
} from '@/lib/notifications/send-lesson-qa-notifications'
import type { LessonQaMessage, LessonQaThreadWithMessages } from '@/types/lesson-qa'

const MAX_MESSAGE_LENGTH = 4000

export interface LessonQaActionResult {
  success: boolean
  thread?: LessonQaThreadWithMessages
  message?: LessonQaMessage
  error?: string
}

function trimContent(content: string): string {
  return content.trim().slice(0, MAX_MESSAGE_LENGTH)
}

async function fetchThreadWithMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string
): Promise<LessonQaThreadWithMessages | null> {
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
    .eq('id', threadId)
    .maybeSingle()

  if (error || !data) return null

  const messages = ((data.lesson_qa_messages ?? []) as LessonQaMessage[]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return {
    id: data.id,
    lesson_id: data.lesson_id,
    course_id: data.course_id,
    student_id: data.student_id,
    instructor_id: data.instructor_id,
    status: data.status,
    last_message_at: data.last_message_at,
    created_at: data.created_at,
    messages,
  }
}

export async function postStudentLessonQuestion(
  courseId: string,
  lessonId: string,
  content: string,
  locale: string
): Promise<LessonQaActionResult> {
  const body = trimContent(content)
  if (!body) return { success: false, error: 'empty_message' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthenticated' }

  const allowed = await canAccessLessonQa(supabase, user.id, courseId, lessonId)
  if (!allowed) return { success: false, error: 'unauthorized' }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id, title, title_ar, slug')
    .eq('id', courseId)
    .maybeSingle()

  if (!course?.instructor_id) return { success: false, error: 'course_not_found' }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('title, title_ar, slug')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!lesson) return { success: false, error: 'lesson_not_found' }

  let threadId: string

  const { data: existing } = await supabase
    .from('lesson_qa_threads')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing?.id) {
    threadId = existing.id
  } else {
    const { data: created, error: createError } = await supabase
      .from('lesson_qa_threads')
      .insert({
        lesson_id: lessonId,
        course_id: courseId,
        student_id: user.id,
        instructor_id: course.instructor_id,
        status: 'open',
      })
      .select('id')
      .single()

    if (createError || !created) {
      console.error('[lesson-qa] create thread failed:', createError)
      return { success: false, error: 'create_failed' }
    }
    threadId = created.id
  }

  const now = new Date().toISOString()

  const { data: message, error: messageError } = await supabase
    .from('lesson_qa_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      sender_role: 'student',
      content: body,
    })
    .select('id, thread_id, sender_id, sender_role, content, created_at')
    .single()

  if (messageError || !message) {
    console.error('[lesson-qa] insert message failed:', messageError)
    return { success: false, error: 'send_failed' }
  }

  await supabase
    .from('lesson_qa_threads')
    .update({ status: 'open', last_message_at: now })
    .eq('id', threadId)

  const { data: studentProfile } = await supabase
    .from('users')
    .select('full_name, full_name_ar')
    .eq('id', user.id)
    .maybeSingle()

  const studentName = studentProfile?.full_name ?? 'Student'
  const lessonTitle = lesson.title
  const courseTitle = course.title

  void notifyInstructorOfLessonQuestion({
    instructorId: course.instructor_id,
    courseId,
    threadId,
    studentName,
    lessonTitle,
    lessonTitleAr: lesson.title_ar,
    courseTitle,
    courseTitleAr: course.title_ar,
    questionPreview: body,
  })

  const thread = await fetchThreadWithMessages(supabase, threadId)
  const courseSlug = course.slug ?? courseId
  const lessonSlug = lesson.slug ?? lessonId
  revalidatePath(buildLearnLessonPath(locale, courseSlug, lessonSlug))

  return { success: true, thread: thread ?? undefined, message: message as LessonQaMessage }
}

export async function postInstructorLessonReply(
  threadId: string,
  courseId: string,
  content: string,
  locale: string
): Promise<LessonQaActionResult> {
  const body = trimContent(content)
  if (!body) return { success: false, error: 'empty_message' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthenticated' }

  const { data: thread } = await supabase
    .from('lesson_qa_threads')
    .select(
      `
      id,
      lesson_id,
      course_id,
      student_id,
      instructor_id,
      status
    `
    )
    .eq('id', threadId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!thread || thread.instructor_id !== user.id) {
    return { success: false, error: 'unauthorized' }
  }

  const { data: message, error: messageError } = await supabase
    .from('lesson_qa_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      sender_role: 'instructor',
      content: body,
    })
    .select('id, thread_id, sender_id, sender_role, content, created_at')
    .single()

  if (messageError || !message) {
    console.error('[lesson-qa] instructor reply failed:', messageError)
    return { success: false, error: 'send_failed' }
  }

  const now = new Date().toISOString()
  await supabase
    .from('lesson_qa_threads')
    .update({ status: 'answered', last_message_at: now })
    .eq('id', threadId)

  const [{ data: lesson }, { data: course }] = await Promise.all([
    supabase
      .from('lessons')
      .select('title, title_ar, slug')
      .eq('id', thread.lesson_id)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('title, title_ar, slug')
      .eq('id', courseId)
      .maybeSingle(),
  ])

  void notifyStudentOfLessonAnswer({
    studentId: thread.student_id,
    courseId,
    threadId,
    lessonId: thread.lesson_id,
    courseSlug: course?.slug ?? courseId,
    lessonSlug: lesson?.slug ?? thread.lesson_id,
    lessonTitle: lesson?.title ?? 'Lesson',
    lessonTitleAr: lesson?.title_ar ?? lesson?.title ?? 'الدرس',
    courseTitle: course?.title ?? 'Course',
    courseTitleAr: course?.title_ar ?? course?.title ?? 'الدورة',
    answerPreview: body,
  })

  revalidatePath(studioSectionPath(locale, courseId, 'qa'))
  if (course && lesson) {
    revalidatePath(
      buildLearnLessonPath(locale, course.slug ?? courseId, lesson.slug ?? thread.lesson_id)
    )
  }

  const fullThread = await fetchThreadWithMessages(supabase, threadId)
  return { success: true, thread: fullThread ?? undefined, message: message as LessonQaMessage }
}
