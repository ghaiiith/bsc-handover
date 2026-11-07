'use client'

import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JourneyControlsProps {
  locale: string
  isPaused: boolean
  onTogglePause: () => void
  onReplay: () => void
  onSkip: () => void
  className?: string
}

export default function JourneyControls({
  locale,
  isPaused,
  onTogglePause,
  onReplay,
  onSkip,
  className,
}: JourneyControlsProps) {
  const isAr = locale === 'ar'

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-0.5 opacity-70 transition-opacity hover:opacity-100',
        className
      )}
      role="toolbar"
      aria-label={isAr ? 'تحكم بالجدول الزمني' : 'Timeline controls'}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onTogglePause}
        aria-label={isPaused ? (isAr ? 'تشغيل' : 'Play') : isAr ? 'إيقاف' : 'Pause'}
      >
        {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onReplay}
        aria-label={isAr ? 'إعادة' : 'Replay'}
      >
        <RotateCcw className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onSkip}
        aria-label={isAr ? 'تخطي' : 'Skip to end'}
      >
        <SkipForward className="size-3.5" />
      </Button>
    </div>
  )
}
