'use client'

import Link from 'next/link'
import { useCallback, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import { markLessonComplete } from '@/lib/courses/progress-actions'
import { useLessonPlayer } from '@/components/courses/LessonPlayerProvider'

interface LessonMobileActionBarProps {
  previousLessonSlug?: string
  nextLessonSlug?: string
  lessonId: string
  courseId: string
  initiallyCompleted: boolean
  className?: string
}

export default function LessonMobileActionBar({
  previousLessonSlug,
  nextLessonSlug,
  lessonId,
  courseId,
  initiallyCompleted,
  className,
}: LessonMobileActionBarProps) {
  const t = useTranslations('courses')
  const tPlayer = useTranslations('video_player')
  const { locale, courseSlug, markLessonCompleted, completedLessonIds } =
    useLessonPlayer()
  const isRtl = locale === 'ar'
  const [pending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(
    initiallyCompleted || completedLessonIds.includes(lessonId)
  )

  const handleComplete = useCallback(() => {
    if (completed || pending) return
    startTransition(async () => {
      const result = await markLessonComplete(lessonId, courseId, locale)
      if (result.success) {
        setCompleted(true)
        markLessonCompleted(lessonId)
      }
    })
  }, [completed, pending, lessonId, courseId, locale, markLessonCompleted])

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-card/60 p-2',
        className
      )}
      role="navigation"
      aria-label={t('previous_lesson')}
    >
      {previousLessonSlug ? (
        <Link
          href={buildLearnLessonPath(locale, courseSlug, previousLessonSlug)}
          scroll={false}
          prefetch
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-11 min-w-0 gap-1 px-2 text-xs sm:text-sm'
          )}
        >
          {isRtl ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <ChevronLeft className="size-4 shrink-0" />
          )}
          <span className="truncate">{t('previous_lesson')}</span>
        </Link>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="h-11 min-w-0 gap-1 px-2 text-xs opacity-50 sm:text-sm"
        >
          {isRtl ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <ChevronLeft className="size-4 shrink-0" />
          )}
          <span className="truncate">{t('previous_lesson')}</span>
        </Button>
      )}

      <Button
        type="button"
        variant={completed ? 'secondary' : 'default'}
        size="sm"
        disabled={completed || pending}
        onClick={handleComplete}
        className={cn(
          'h-11 min-w-0 gap-1.5 px-2 text-xs sm:text-sm',
          completed && 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        )}
        aria-label={completed ? t('completed') : tPlayer('mark_complete')}
      >
        {completed ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : (
          <Circle className="size-4 shrink-0" />
        )}
        <span className="truncate">
          {completed ? t('completed') : tPlayer('mark_complete')}
        </span>
      </Button>

      {nextLessonSlug ? (
        <Link
          href={buildLearnLessonPath(locale, courseSlug, nextLessonSlug)}
          scroll={false}
          prefetch
          className={cn(
            buttonVariants({ size: 'sm' }),
            'h-11 min-w-0 gap-1 px-2 text-xs sm:text-sm'
          )}
        >
          <span className="truncate">{t('next_lesson')}</span>
          {isRtl ? (
            <ChevronLeft className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
        </Link>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled
          className="h-11 min-w-0 gap-1 px-2 text-xs opacity-50 sm:text-sm"
        >
          <span className="truncate">{t('next_lesson')}</span>
          {isRtl ? (
            <ChevronLeft className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
        </Button>
      )}
    </div>
  )
}

interface LessonMobileInfoProps {
  title: string
  moduleName: string
  durationMinutes: number
  isCompleted: boolean
  progressPercent?: number
  className?: string
}

export function LessonMobileInfo({
  title,
  moduleName,
  durationMinutes,
  isCompleted,
  progressPercent,
  className,
}: LessonMobileInfoProps) {
  const t = useTranslations('courses')

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {isCompleted ? (
          <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
            <CheckCircle2 className="size-3.5" />
            {t('completed')}
          </Badge>
        ) : null}
        {typeof progressPercent === 'number' ? (
          <Badge variant="secondary" className="num-en font-normal">
            {t('progress')}: {progressPercent}%
          </Badge>
        ) : null}
      </div>
      <h1 className="text-lg font-bold leading-snug tracking-tight sm:text-xl">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">
        <span className="line-clamp-1">{moduleName}</span>
        <span className="mx-1.5 text-border" aria-hidden>
          ·
        </span>
        <span className="num-en whitespace-nowrap">
          {durationMinutes} {t('minutes')}
        </span>
      </p>
    </div>
  )
}
