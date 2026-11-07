import { getLessonContent } from '@/lib/courses/get-lesson-content'
import { getLessonCourseShell } from '@/lib/courses/get-lesson-course-shell'
import type { LessonPlayerData } from '@/lib/courses/lesson-player-types'

export type { LessonPlayerData, LessonPlayerResult } from '@/lib/courses/lesson-player-types'

export async function getLessonPlayerData(
  courseId: string,
  lessonId: string
) {
  const shellResult = await getLessonCourseShell(courseId)
  if (!shellResult.ok) {
    return { ok: false as const, reason: shellResult.reason }
  }

  const contentResult = await getLessonContent(courseId, lessonId, {
    sections: shellResult.data.sections,
    isInstructor: shellResult.data.isInstructor,
    isAdmin: shellResult.data.isAdmin,
    userId: shellResult.data.userId,
  })

  if (!contentResult.ok) {
    return { ok: false as const, reason: contentResult.reason }
  }

  const { course, sections, completedLessonIds, progressPercent, completedLessons, totalLessons, userId } =
    shellResult.data
  const content = contentResult.data

  return {
    ok: true as const,
    data: {
      course,
      sections,
      completedLessonIds,
      progressPercent,
      completedLessons,
      totalLessons,
      userId,
      ...content,
    } satisfies LessonPlayerData,
  }
}
