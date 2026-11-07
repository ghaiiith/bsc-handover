'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  computeCourseProgress,
  type SectionWithLessons,
} from '@/lib/courses/lesson-utils'
import type { EnrollmentCertStatus } from '@/lib/certificates/enrollment-cert-status'

export interface LessonPlayerContextValue {
  locale: string
  courseId: string
  courseSlug: string
  courseTitle: string
  sections: SectionWithLessons[]
  completedLessonIds: string[]
  progressPercent: number
  completedLessons: number
  totalLessons: number
  isCourseComplete: boolean
  certStatus: EnrollmentCertStatus | null
  markLessonCompleted: (lessonId: string) => void
}

const LessonPlayerContext = createContext<LessonPlayerContextValue | null>(null)

interface LessonPlayerProviderProps {
  locale: string
  courseId: string
  courseSlug: string
  courseTitle: string
  sections: SectionWithLessons[]
  initialCompletedLessonIds: string[]
  totalLessons: number
  certStatus: EnrollmentCertStatus | null
  children: ReactNode
}

export function LessonPlayerProvider({
  locale,
  courseId,
  courseSlug,
  courseTitle,
  sections,
  initialCompletedLessonIds,
  totalLessons,
  certStatus,
  children,
}: LessonPlayerProviderProps) {
  const [completedLessonIds, setCompletedLessonIds] = useState(
    initialCompletedLessonIds
  )

  const markLessonCompleted = useCallback((lessonId: string) => {
    setCompletedLessonIds((prev) =>
      prev.includes(lessonId) ? prev : [...prev, lessonId]
    )
  }, [])

  const progress = useMemo(() => {
    const completedSet = new Set(completedLessonIds)
    return computeCourseProgress(sections, completedSet, totalLessons)
  }, [completedLessonIds, sections, totalLessons])

  const isCourseComplete =
    progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons

  const value = useMemo<LessonPlayerContextValue>(
    () => ({
      locale,
      courseId,
      courseSlug,
      courseTitle,
      sections,
      completedLessonIds,
      progressPercent: progress.progressPercent,
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      isCourseComplete,
      certStatus,
      markLessonCompleted,
    }),
    [
      locale,
      courseId,
      courseSlug,
      courseTitle,
      sections,
      completedLessonIds,
      progress,
      isCourseComplete,
      certStatus,
      markLessonCompleted,
    ]
  )

  return (
    <LessonPlayerContext.Provider value={value}>
      {children}
    </LessonPlayerContext.Provider>
  )
}

export function useLessonPlayer(): LessonPlayerContextValue {
  const context = useContext(LessonPlayerContext)
  if (!context) {
    throw new Error('useLessonPlayer must be used within LessonPlayerProvider')
  }
  return context
}
