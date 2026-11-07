import 'server-only'

import type { Course, Lesson } from '@/types'

type RawSection = {
  order_index: number
  lessons: Pick<Lesson, 'id' | 'order_index'>[] | null
}

export function flattenOrderedLessonIds(sections: RawSection[]): string[] {
  return sections
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((section) =>
      (section.lessons ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => lesson.id)
    )
}

export function computeCourseProgressFromSections(
  course: Pick<Course, 'total_lessons'>,
  sections: RawSection[],
  completedLessonIds: Set<string>
): {
  progressPercent: number
  completedLessons: number
  totalLessons: number
  isComplete: boolean
} {
  const orderedIds = flattenOrderedLessonIds(sections)
  const totalLessons = orderedIds.length > 0 ? orderedIds.length : course.total_lessons
  const completedLessons = orderedIds.length
    ? orderedIds.filter((id) => completedLessonIds.has(id)).length
    : 0
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const minProgress = 100
  const isComplete =
    totalLessons > 0 && progressPercent >= minProgress && completedLessons >= totalLessons

  return { progressPercent, completedLessons, totalLessons, isComplete }
}
