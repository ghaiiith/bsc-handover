'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PlayerOverlayShell from '@/components/video-player/PlayerOverlayShell'
import {
  playerEndScreenButtonBase,
  playerEndScreenButtonBaseFullscreen,
  playerOverlayPanel,
} from '@/components/video-player/player-ui-styles'
import { cn } from '@/lib/utils'
import type { LessonPlaybackMetadata } from '@/types/video-player'

interface PlayerEndScreenProps {
  metadata?: LessonPlaybackMetadata
  onReplay: () => void
  onNextLesson?: () => void
  onPreviousLesson?: () => void
  onBackToCourse?: () => void
  onMarkComplete?: () => void
  hasNext: boolean
  hasPrevious: boolean
  autoplayNext?: boolean
  countdownSeconds?: number
  isFullscreen?: boolean
}

export default function PlayerEndScreen({
  metadata,
  onReplay,
  onNextLesson,
  onPreviousLesson,
  onBackToCourse,
  onMarkComplete,
  hasNext,
  hasPrevious,
  autoplayNext = true,
  countdownSeconds = 5,
  isFullscreen = false,
}: PlayerEndScreenProps) {
  const t = useTranslations('video_player')
  const [countdown, setCountdown] = useState(
    hasNext && autoplayNext ? countdownSeconds : -1
  )
  const cancelledRef = useRef(false)
  const buttonBase = isFullscreen
    ? playerEndScreenButtonBaseFullscreen
    : playerEndScreenButtonBase

  const cancelCountdown = useCallback(() => {
    cancelledRef.current = true
    setCountdown(-1)
  }, [])

  useEffect(() => {
    if (!hasNext || !autoplayNext || !onNextLesson || countdown < 0) return
    if (countdown === 0) {
      if (!cancelledRef.current) onNextLesson()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, hasNext, autoplayNext, onNextLesson])

  return (
    <PlayerOverlayShell
      variant="fullscreen"
      className="z-50 bg-black/92"
      role="dialog"
      aria-label={t('lesson_completed')}
    >
      <div
        className={cn(
          playerOverlayPanel,
          'w-full text-center',
          isFullscreen
            ? 'max-w-[18rem] px-5 py-6 sm:max-w-[20rem]'
            : 'max-w-[15rem] px-4 py-5 sm:max-w-[16.5rem]'
        )}
      >
        <div
          className={cn(
            'mx-auto mb-3 flex items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25',
            isFullscreen ? 'h-11 w-11' : 'h-9 w-9'
          )}
        >
          <CheckCircle2
            className={cn(
              'text-primary animate-in zoom-in duration-500 motion-reduce:animate-none',
              isFullscreen ? 'h-5 w-5' : 'h-4 w-4'
            )}
            aria-hidden
          />
        </div>

        <h3
          className={cn(
            'font-semibold tracking-tight text-white',
            isFullscreen ? 'text-lg' : 'text-base'
          )}
        >
          {t('lesson_completed')}
        </h3>

        {metadata && (
          <p className="mt-1 text-[11px] text-white/50">
            {t('course_progress', { percent: Math.round(metadata.courseProgress) })}
          </p>
        )}

        {countdown > 0 && hasNext && (
          <p className="mt-2.5 inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] tabular-nums text-white/45 ring-1 ring-white/10">
            {t('next_lesson_countdown', { seconds: countdown })}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {hasNext && onNextLesson && (
            <Button
              type="button"
              className={cn(
                buttonBase,
                'w-full bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/90'
              )}
              onClick={() => {
                cancelCountdown()
                onNextLesson()
              }}
            >
              {countdown > 0 ? t('start_next_lesson') : t('continue_learning')}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className={cn(
              buttonBase,
              'w-full border-white/30 bg-transparent text-white hover:bg-white/8 hover:text-white'
            )}
            onClick={onReplay}
          >
            <RotateCcw className="me-1.5 h-3.5 w-3.5" />
            {t('replay_lesson')}
          </Button>

          {onBackToCourse && (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                buttonBase,
                'w-full text-white/70 hover:bg-white/5 hover:text-white'
              )}
              onClick={onBackToCourse}
            >
              <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
              {t('back_to_course')}
            </Button>
          )}
        </div>

        {(hasPrevious || onMarkComplete || countdown > 0) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-white/8 pt-3 text-[10px]">
            {hasPrevious && onPreviousLesson && (
              <button
                type="button"
                className="text-white/45 transition-colors hover:text-white/70"
                onClick={onPreviousLesson}
              >
                {t('previous_lesson')}
              </button>
            )}
            {onMarkComplete && (
              <button
                type="button"
                className="text-white/45 transition-colors hover:text-white/70"
                onClick={onMarkComplete}
              >
                {t('mark_complete')}
              </button>
            )}
            {countdown > 0 && (
              <button
                type="button"
                className="text-white/35 transition-colors hover:text-white/55"
                onClick={cancelCountdown}
              >
                {t('cancel_countdown')}
              </button>
            )}
          </div>
        )}
      </div>
    </PlayerOverlayShell>
  )
}
