import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeCourseProgress,
  sortSectionsWithLessons,
  type SectionWithLessons,
} from '@/lib/courses/lesson-utils'
import type { Course, Lesson, UserRole } from '@/types'
import { stripTrainerOnlyFieldsFromList } from '@/lib/courses/strip-trainer-only-fields'

export interface LessonCourseShellData {
  course: Course
  sections: SectionWithLessons[]
  completedLessonIds: string[]
  progressPercent: number
  completedLessons: number
  totalLessons: number
  userId: string
  isInstructor: boolean
  isAdmin: boolean
}

export type LessonCourseShellResult =
  | { ok: true; data: LessonCourseShellData }
  | { ok: false; reason: 'unauthenticated' | 'not_found' }

type RawSection = {
  id: string
  title: string
  title_ar: string
  order_index: number
  lessons: Lesson[] | null
}

async function attachLessonsToSections(
  sections: SectionWithLessons[],
  courseId: string
): Promise<SectionWithLessons[]> {
  const admin = createAdminClient()
  const { data: lessonRows } = await admin
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')

  // Report BS-31: select('*') would otherwise ship trainer-only notes to students.
  const lessons = stripTrainerOnlyFieldsFromList((lessonRows ?? []) as Lesson[])

  return sections.map((section) => ({
    ...section,
    lessons: lessons
      .filter((lesson) => lesson.section_id === section.id)
      .sort((a, b) => a.order_index - b.order_index),
  }))
}

export const getLessonCourseShell = cache(async function getLessonCourseShell(
  courseId: string
): Promise<LessonCourseShellResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, reason: 'unauthenticated' }
  }

  const { data: courseRow, error: courseError } = await supabase
    .from('courses')
    .select(`
      *,
      course_sections(
        id, title, title_ar, order_index
      )
    `)
    .eq('id', courseId)
    .single()

  if (courseError || !courseRow) {
    return { ok: false, reason: 'not_found' }
  }

  const { course_sections: sectionsRaw, ...courseData } = courseRow as Course & {
    course_sections: RawSection[] | null
  }

  const sortedSections = sortSectionsWithLessons(
    (sectionsRaw ?? []).map((section) => ({
      ...section,
      lessons: [],
    }))
  )

  const sections = await attachLessonsToSections(sortedSections, courseId)

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role as UserRole | undefined
  const isInstructor = courseData.instructor_id === user.id
  const isAdmin = userRole === 'admin'

  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', user.id)
    .eq('completed', true)

  const completedLessonIds = (progressRows ?? []).map((row) => row.lesson_id as string)
  const completedSet = new Set(completedLessonIds)

  const { progressPercent, completedLessons, totalLessons } = computeCourseProgress(
    sections,
    completedSet,
    courseData.total_lessons
  )

  return {
    ok: true,
    data: {
      course: courseData,
      sections,
      completedLessonIds,
      progressPercent,
      completedLessons,
      totalLessons,
      userId: user.id,
      isInstructor,
      isAdmin,
    },
  }
})
