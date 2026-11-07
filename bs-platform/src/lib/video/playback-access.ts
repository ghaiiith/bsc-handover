import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface LessonPlaybackContext {
  lesson: {
    id: string
    course_id: string
    is_free_preview: boolean
    lesson_type: string | null
    video_asset_id: string | null
    title: string
  }
  allowed: boolean
  user: {
    id: string
    displayName: string | null
    email: string | null
    isAdmin?: boolean
  } | null
  course: {
    title: string
  } | null
}

/**
 * Authorization layer for lesson video playback. Access is granted when the
 * lesson is a free preview, or the requester is enrolled / the course owner /
 * an admin. Returns null when the lesson does not exist for the course.
 */
export async function resolveLessonPlaybackAccess(
  courseId: string,
  lessonId: string
): Promise<LessonPlaybackContext | null> {
  const admin = createAdminClient()

  const { data: lessonRow } = await admin
    .from('lessons')
    .select('id, course_id, is_free_preview, lesson_type, video_asset_id, title')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lessonRow || lessonRow.course_id !== courseId) {
    return null
  }

  const lesson = {
    id: lessonRow.id as string,
    course_id: lessonRow.course_id as string,
    is_free_preview: Boolean(lessonRow.is_free_preview),
    lesson_type: (lessonRow.lesson_type as string | null) ?? null,
    video_asset_id: (lessonRow.video_asset_id as string | null) ?? null,
    title: lessonRow.title as string,
  }

  const { data: courseRow } = await admin
    .from('courses')
    .select('title, instructor_id')
    .eq('id', courseId)
    .maybeSingle()

  const course = courseRow
    ? { title: courseRow.title as string, instructor_id: courseRow.instructor_id as string }
    : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let playbackUser: LessonPlaybackContext['user'] = null
  if (user) {
    const { data: profile } = await admin
      .from('users')
      .select('full_name, email, role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_active === false) {
      return { lesson, allowed: false, user: null, course: course ? { title: course.title } : null }
    }

    playbackUser = {
      id: user.id,
      displayName: (profile?.full_name as string | null) ?? null,
      email: (profile?.email as string | null) ?? user.email ?? null,
      isAdmin: profile?.role === 'admin',
    }
  }

  if (lesson.is_free_preview) {
    return {
      lesson,
      allowed: true,
      user: playbackUser,
      course: course ? { title: course.title } : null,
    }
  }

  if (!user) {
    return { lesson, allowed: false, user: null, course: course ? { title: course.title } : null }
  }

  const [{ data: profile }, { data: enrollment }] = await Promise.all([
    admin.from('users').select('role').eq('id', user.id).maybeSingle(),
    admin
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle(),
  ])

  const isAdmin = profile?.role === 'admin'
  const isOwner = course?.instructor_id === user.id
  const isEnrolled = Boolean(enrollment)

  return {
    lesson,
    allowed: isAdmin || isOwner || isEnrolled,
    user: playbackUser,
    course: course ? { title: course.title } : null,
  }
}
