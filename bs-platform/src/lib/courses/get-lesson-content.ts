import { createClient } from '@/lib/supabase/server'
import { getAdjacentLessons, type SectionWithLessons } from '@/lib/courses/lesson-utils'
import { isVideoLessonType } from '@/lib/courses/lesson-type-utils'
import type { Lesson } from '@/types'

export interface LessonContentData {
  currentLesson: Lesson
  /** Whether this lesson has a playable video asset (signed URL fetched client-side). */
  hasVideo: boolean
  previousLessonId?: string
  nextLessonId?: string
  previousLessonSlug?: string
  nextLessonSlug?: string
}

export type LessonContentResult =
  | { ok: true; data: LessonContentData }
  | { ok: false; reason: 'unauthorized' | 'not_found' }

interface LessonContentContext {
  sections: SectionWithLessons[]
  isInstructor: boolean
  isAdmin: boolean
  userId: string
}

export async function getLessonContent(
  courseId: string,
  lessonId: string,
  context: LessonContentContext
): Promise<LessonContentResult> {
  const currentLesson = context.sections
    .flatMap((section) => section.lessons)
    .find((lesson) => lesson.id === lessonId)

  if (!currentLesson) {
    return { ok: false, reason: 'not_found' }
  }

  if (!context.isInstructor && !context.isAdmin) {
    const isFreePreview = currentLesson.is_free_preview

    if (!isFreePreview) {
      const supabase = await createClient()
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', context.userId)
        .eq('course_id', courseId)
        .maybeSingle()

      if (!enrollment) {
        return { ok: false, reason: 'unauthorized' }
      }
    }
  }

  const { previous, next } = getAdjacentLessons(context.sections, lessonId)

  const findLessonSlug = (lessonIdRef?: string) => {
    if (!lessonIdRef) return undefined
    return context.sections
      .flatMap((section) => section.lessons)
      .find((lesson) => lesson.id === lessonIdRef)?.slug
  }

  const lessonType = currentLesson.lesson_type ?? 'video'
  const hasVideo =
    isVideoLessonType(lessonType) && Boolean(currentLesson.video_asset_id)

  return {
    ok: true,
    data: {
      currentLesson,
      hasVideo,
      previousLessonId: previous?.id,
      nextLessonId: next?.id,
      previousLessonSlug: findLessonSlug(previous?.id),
      nextLessonSlug: findLessonSlug(next?.id),
    },
  }
}
