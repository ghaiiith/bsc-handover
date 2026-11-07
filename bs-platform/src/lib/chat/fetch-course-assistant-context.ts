import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseLessonContent } from '@/lib/chat/parse-lesson-content'
import type {
  CourseAssistantContext,
  CourseAssistantLessonContext,
} from '@/types/course-assistant'
import type { Lesson, UserRole } from '@/types'

interface RawSection {
  id: string
  title: string
  title_ar: string
  order_index: number
  lessons: Array<
    Pick<
      Lesson,
      | 'id'
      | 'title'
      | 'title_ar'
      | 'duration_minutes'
      | 'is_free_preview'
      | 'content_html'
      | 'order_index'
    >
  > | null
}

interface CourseRow {
  id: string
  instructor_id: string
  title: string
  title_ar: string
  description?: string | null
  description_ar?: string | null
  category: string
  level: string
  language: string
  status: string
  learning_outcomes?: string[] | null
  instructor: {
    full_name: string
    full_name_ar?: string | null
    bio?: string | null
    bio_ar?: string | null
  } | null
  course_sections: RawSection[] | null
  enrollments: { count: number }[]
}

export interface CourseAssistantAccess {
  userId: string
  userRole: UserRole | null
  isEnrolled: boolean
  isInstructor: boolean
  isAdmin: boolean
}

export type FetchCourseAssistantResult =
  | { ok: true; context: CourseAssistantContext; access: CourseAssistantAccess }
  | { ok: false; reason: 'not_found' | 'unauthenticated' | 'forbidden' }

function sortSections(sections: RawSection[]): RawSection[] {
  return [...sections]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => ({
      ...section,
      lessons: [...(section.lessons ?? [])].sort((a, b) => a.order_index - b.order_index),
    }))
}

function toLessonContext(
  lesson: NonNullable<RawSection['lessons']>[number],
  quizTitlesByLesson: Map<string, string[]>
): CourseAssistantLessonContext {
  const descriptions = parseLessonContent(lesson.content_html)
  return {
    id: lesson.id,
    title: lesson.title,
    title_ar: lesson.title_ar,
    description: descriptions.description,
    description_ar: descriptions.description_ar,
    duration_minutes: lesson.duration_minutes,
    is_free_preview: lesson.is_free_preview,
    quiz_question_titles: quizTitlesByLesson.get(lesson.id) ?? [],
  }
}

export async function fetchCourseAssistantContext(
  courseId: string,
  lessonId?: string
): Promise<FetchCourseAssistantResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, reason: 'unauthenticated' }
  }

  const { data: courseRow, error } = await supabase
    .from('courses')
    .select(`
      id, instructor_id, title, title_ar, description, description_ar,
      category, level, language, status, learning_outcomes,
      instructor:users(full_name, full_name_ar, bio, bio_ar),
      course_sections(
        id, title, title_ar, order_index,
        lessons(id, title, title_ar, duration_minutes, is_free_preview, content_html, order_index)
      ),
      enrollments(count)
    `)
    .eq('id', courseId)
    .single()

  if (error || !courseRow) {
    return { ok: false, reason: 'not_found' }
  }

  const course = courseRow as unknown as CourseRow
  if (!course.instructor) {
    return { ok: false, reason: 'not_found' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const userRole = (profile?.role as UserRole | undefined) ?? null
  const isInstructor = course.instructor_id === user.id
  const isAdmin = userRole === 'admin'
  const isPublished = course.status === 'published'

  if (!isPublished && !isInstructor && !isAdmin) {
    return { ok: false, reason: 'not_found' }
  }

  let isEnrolled = false
  if (!isInstructor && !isAdmin) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()
    isEnrolled = Boolean(enrollment)
  } else {
    isEnrolled = true
  }

  if (lessonId && !isEnrolled && !isInstructor && !isAdmin) {
    return { ok: false, reason: 'forbidden' }
  }

  const sections = sortSections(course.course_sections ?? [])
  const lessonIds = sections.flatMap((s) => (s.lessons ?? []).map((l) => l.id))

  const quizTitlesByLesson = new Map<string, string[]>()
  if (lessonIds.length > 0) {
    const { data: quizzes } = await supabase
      .from('course_quizzes')
      .select('id, lesson_id')
      .eq('course_id', courseId)
      .in('lesson_id', lessonIds)

    const quizIds = (quizzes ?? []).map((q) => q.id as string)
    const quizLessonMap = new Map(
      (quizzes ?? []).map((q) => [q.id as string, q.lesson_id as string | null])
    )

    if (quizIds.length > 0) {
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('quiz_id, question_text, question_text_ar')
        .in('quiz_id', quizIds)
        .order('order_index', { ascending: true })

      for (const question of questions ?? []) {
        const lessonRef = quizLessonMap.get(question.quiz_id as string)
        if (!lessonRef) continue
        const title =
          (question.question_text_ar as string | null)?.trim() ||
          (question.question_text as string).trim()
        const existing = quizTitlesByLesson.get(lessonRef) ?? []
        existing.push(title)
        quizTitlesByLesson.set(lessonRef, existing)
      }
    }
  }

  const sectionContexts = sections.map((section) => ({
    title: section.title,
    title_ar: section.title_ar,
    lessons: (section.lessons ?? []).map((lesson) => toLessonContext(lesson, quizTitlesByLesson)),
  }))

  const flatLessons = sectionContexts.flatMap((s) => s.lessons)
  const currentLesson = lessonId
    ? flatLessons.find((lesson) => lesson.id === lessonId)
    : undefined

  if (lessonId && !currentLesson) {
    return { ok: false, reason: 'not_found' }
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('target_type', 'course')
    .eq('target_id', courseId)

  const reviewRows = reviews ?? []
  const avgRating =
    reviewRows.length > 0
      ? reviewRows.reduce((sum, r) => sum + (r.rating as number), 0) / reviewRows.length
      : 0

  const learningOutcomes = Array.isArray(course.learning_outcomes)
    ? course.learning_outcomes.filter((item): item is string => typeof item === 'string')
    : []

  const context: CourseAssistantContext = {
    courseId,
    title: course.title,
    title_ar: course.title_ar,
    description: course.description ?? undefined,
    description_ar: course.description_ar ?? undefined,
    category: course.category,
    level: course.level,
    language: course.language,
    learning_outcomes: learningOutcomes,
    instructor: {
      full_name: course.instructor.full_name,
      full_name_ar: course.instructor.full_name_ar ?? undefined,
      bio: course.instructor.bio ?? undefined,
      bio_ar: course.instructor.bio_ar ?? undefined,
    },
    sections: sectionContexts,
    avg_rating: Math.round(avgRating * 10) / 10,
    enrollment_count: course.enrollments?.[0]?.count ?? 0,
    currentLesson,
  }

  return {
    ok: true,
    context,
    access: {
      userId: user.id,
      userRole,
      isEnrolled,
      isInstructor,
      isAdmin,
    },
  }
}
