import { createClient } from '@/lib/supabase/server'
import type { Course, Lesson, User } from '@/types'

export interface EnrolledCourseItem {
  enrollmentId: string
  enrolledAt: string
  course: Course
  instructor: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
  progressPercent: number
  completedLessons: number
  totalLessons: number
  continueLessonId?: string
  continueLessonSlug?: string
  isComplete: boolean
}

type OrderedLesson = {
  id: string
  slug: string
  sectionOrder: number
  order_index: number
}

type RawSection = {
  order_index: number
  lessons: Pick<Lesson, 'id' | 'slug' | 'order_index'>[] | null
}

function flattenOrderedLessons(sections: RawSection[]): OrderedLesson[] {
  return sections
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((section) =>
      (section.lessons ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => ({
          id: lesson.id,
          slug: lesson.slug,
          sectionOrder: section.order_index,
          order_index: lesson.order_index,
        }))
    )
}

function computeProgress(
  course: Course,
  sections: RawSection[],
  completedLessonIds: Set<string>
): Pick<
  EnrolledCourseItem,
  'progressPercent' | 'completedLessons' | 'totalLessons' | 'continueLessonId' | 'continueLessonSlug' | 'isComplete'
> {
  const orderedLessons = flattenOrderedLessons(sections)
  const totalLessons =
    orderedLessons.length > 0 ? orderedLessons.length : course.total_lessons

  const completedLessons = orderedLessons.length
    ? orderedLessons.filter((l) => completedLessonIds.has(l.id)).length
    : 0

  const progressPercent =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

  const firstIncomplete = orderedLessons.find((l) => !completedLessonIds.has(l.id))
  const isComplete = totalLessons > 0 && completedLessons >= totalLessons

  return {
    progressPercent,
    completedLessons,
    totalLessons,
    continueLessonId: firstIncomplete?.id ?? orderedLessons[0]?.id,
    continueLessonSlug: firstIncomplete?.slug ?? orderedLessons[0]?.slug,
    isComplete,
  }
}

export async function getMyEnrollments(
  userId: string
): Promise<EnrolledCourseItem[]> {
  const supabase = await createClient()

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      course_id,
      course:courses(
        *,
        instructor:users(id, full_name, full_name_ar, avatar_url),
        course_sections(order_index, lessons(id, slug, order_index))
      )
    `)
    .eq('student_id', userId)
    .order('enrolled_at', { ascending: false })

  if (error || !enrollments) {
    return []
  }

  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', userId)
    .eq('completed', true)

  const completedLessonIds = new Set(
    (progressRows ?? []).map((row) => row.lesson_id as string)
  )

  return (enrollments ?? [])
    .map((row) => {
      const courseRaw = Array.isArray(row.course) ? row.course[0] : row.course
      if (!courseRaw?.instructor) return null

      const instructorRaw = courseRaw.instructor
      const instructor = Array.isArray(instructorRaw) ? instructorRaw[0] : instructorRaw
      if (!instructor) return null

      const sections = (courseRaw.course_sections ?? []) as RawSection[]
      const { course_sections: _sections, instructor: _instructor, ...courseData } = courseRaw as Course & {
        course_sections: RawSection[] | null
        instructor: typeof instructor
      }

      const progress = computeProgress(courseData, sections, completedLessonIds)

      return {
        enrollmentId: row.id as string,
        enrolledAt: row.enrolled_at as string,
        course: courseData,
        instructor,
        ...progress,
      }
    })
    .filter((item): item is EnrolledCourseItem => item !== null)
}
