import type { Lesson } from '@/types'

export type OrderedLessonRef = {
  id: string
  sectionOrder: number
  order_index: number
}

export type SectionWithLessons = {
  id: string
  title: string
  title_ar: string
  order_index: number
  lessons: Lesson[]
}

export function sortSectionsWithLessons(
  sections: SectionWithLessons[]
): SectionWithLessons[] {
  return sections
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => ({
      ...section,
      lessons: section.lessons.slice().sort((a, b) => a.order_index - b.order_index),
    }))
}

export function flattenOrderedLessons(
  sections: SectionWithLessons[]
): OrderedLessonRef[] {
  return sortSectionsWithLessons(sections).flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      sectionOrder: section.order_index,
      order_index: lesson.order_index,
    }))
  )
}

export function computeCourseProgress(
  sections: SectionWithLessons[],
  completedLessonIds: Set<string>,
  fallbackTotal = 0
): {
  progressPercent: number
  completedLessons: number
  totalLessons: number
} {
  const ordered = flattenOrderedLessons(sections)
  const totalLessons = ordered.length > 0 ? ordered.length : fallbackTotal
  const completedLessons = ordered.filter((l) => completedLessonIds.has(l.id)).length
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return { progressPercent, completedLessons, totalLessons }
}

export function getAdjacentLessons(
  sections: SectionWithLessons[],
  currentLessonId: string
): { previous?: OrderedLessonRef; next?: OrderedLessonRef } {
  const ordered = flattenOrderedLessons(sections)
  const index = ordered.findIndex((l) => l.id === currentLessonId)

  if (index === -1) return {}

  return {
    previous: index > 0 ? ordered[index - 1] : undefined,
    next: index < ordered.length - 1 ? ordered[index + 1] : undefined,
  }
}
