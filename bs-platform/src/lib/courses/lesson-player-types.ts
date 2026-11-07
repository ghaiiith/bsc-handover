import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import type { Course, Lesson } from '@/types'

export interface LessonPlayerData {
  course: Course
  currentLesson: Lesson
  sections: SectionWithLessons[]
  completedLessonIds: string[]
  progressPercent: number
  completedLessons: number
  totalLessons: number
  hasVideo: boolean
  previousLessonId?: string
  nextLessonId?: string
  userId: string
}

export type LessonPlayerResult =
  | { ok: true; data: LessonPlayerData }
  | { ok: false; reason: 'unauthenticated' | 'unauthorized' | 'not_found' }
