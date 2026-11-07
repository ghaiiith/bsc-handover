'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import BsPlatformVideoPlayer from '@/components/video-player/BsPlatformVideoPlayer'
import LessonPlayerShell from '@/components/courses/LessonPlayerShell'
import { useLessonPlayer } from '@/components/courses/LessonPlayerProvider'
import { markLessonComplete } from '@/lib/courses/progress-actions'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import {
  LESSON_VIDEO_BOX_CLASS,
  LESSON_VIDEO_FRAME_CLASS,
} from '@/lib/playback/learn-layout-preferences'
import type { LessonPlaybackMetadata } from '@/types/content-protection'

interface LessonVideoPlayerProps {
  hasVideo: boolean
  lessonId: string
  courseId: string
  courseSlug: string
  locale: string
  initiallyCompleted: boolean
  isAdmin?: boolean
  metadata?: LessonPlaybackMetadata
  previousLessonSlug?: string
  nextLessonSlug?: string
  sidebar?: React.ReactNode
  belowPlayer?: React.ReactNode
}

export default function LessonVideoPlayer({
  hasVideo,
  lessonId,
  courseId,
  courseSlug,
  locale,
  initiallyCompleted,
  isAdmin = false,
  metadata,
  previousLessonSlug,
  nextLessonSlug,
  sidebar,
  belowPlayer,
}: LessonVideoPlayerProps) {
  const t = useTranslations('courses')
  const router = useRouter()
  const { markLessonCompleted } = useLessonPlayer()
  const markedRef = useRef(initiallyCompleted)
  const markingRef = useRef(false)

  const markComplete = useCallback(async () => {
    if (markedRef.current || markingRef.current) return
    markedRef.current = true
    markingRef.current = true
    const result = await markLessonComplete(lessonId, courseId, locale)
    if (result.success) {
      markLessonCompleted(lessonId)
    }
    markingRef.current = false
  }, [lessonId, courseId, locale, markLessonCompleted])

  const handleProgress = useCallback(
    (percent: number) => {
      if (percent >= 90) void markComplete()
    },
    [markComplete]
  )

  const navigateLesson = useCallback(
    (slug?: string) => {
      if (!slug) return
      router.push(buildLearnLessonPath(locale, courseSlug, slug))
    },
    [router, locale, courseSlug]
  )

  if (!hasVideo) {
    return (
      <div className={LESSON_VIDEO_FRAME_CLASS}>
        <div
          className={`${LESSON_VIDEO_BOX_CLASS} flex items-center justify-center text-muted-foreground`}
        >
          {t('no_video')}
        </div>
      </div>
    )
  }

  const playbackEndpoint = `/api/courses/${courseId}/lessons/${lessonId}/playback`
  const analyticsEndpoint = `${playbackEndpoint}/events`

  const player = (
    <div className={LESSON_VIDEO_FRAME_CLASS}>
      <div className={LESSON_VIDEO_BOX_CLASS}>
        <BsPlatformVideoPlayer
          endpoint={playbackEndpoint}
          analyticsEndpoint={analyticsEndpoint}
          courseId={courseId}
          lessonId={lessonId}
          locale={locale}
          metadata={metadata}
          isAdmin={isAdmin}
          className="size-full !aspect-auto rounded-none"
          onProgress={handleProgress}
          onMarkComplete={() => void markComplete()}
          hasPrevious={Boolean(previousLessonSlug)}
          hasNext={Boolean(nextLessonSlug)}
          onPreviousLesson={() => navigateLesson(previousLessonSlug)}
          onNextLesson={() => navigateLesson(nextLessonSlug)}
          onBackToCourse={() => router.push(`/${locale}/courses/${courseSlug}`)}
        />
      </div>
    </div>
  )

  if (!sidebar) {
    return player
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <LessonPlayerShell sidebar={sidebar} mainContent={player}>
        {belowPlayer}
      </LessonPlayerShell>
    </div>
  )
}
