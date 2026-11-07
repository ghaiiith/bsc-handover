import { createClient } from '@/lib/supabase/server'
import type { Course, Lesson } from '@/types'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import { sortSectionsWithLessons } from '@/lib/courses/lesson-utils'

export interface CourseWizardData {
  course: Course
  sections: SectionWithLessons[]
}

type RawSection = {
  id: string
  title: string
  title_ar: string
  order_index: number
  course_id: string
  lessons: Lesson[] | null
}

export async function getCourseForEdit(
  courseId: string,
  userId: string
): Promise<CourseWizardData | null> {
  const supabase = await createClient()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (error || !course) {
    return null
  }

  // Role-aware ownership: the course instructor OR any admin may manage it
  // (joint admin + instructor management).
  if (course.instructor_id !== userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return null
    }
  }

  const { data: sectionsRaw } = await supabase
    .from('course_sections')
    .select(`
      id, title, title_ar, order_index, course_id,
      lessons(*)
    `)
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })

  const sections = sortSectionsWithLessons(
    ((sectionsRaw ?? []) as RawSection[]).map((section) => ({
      ...section,
      lessons: section.lessons ?? [],
    }))
  )

  return {
    course: course as Course,
    sections,
  }
}
