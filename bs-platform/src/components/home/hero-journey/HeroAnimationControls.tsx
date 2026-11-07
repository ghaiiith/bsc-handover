'use client'

import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeroAnimationControlsProps {
  locale: string
  isPaused: boolean
  onTogglePause: () => void
  onReplay: () => void
  onSkip: () => void
  className?: string
}

export default function HeroAnimationControls({
  locale,
  isPaused,
  onTogglePause,
  onReplay,
  onSkip,
  className,
}: HeroAnimationControlsProps) {
  const isAr = locale === 'ar'

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1 opacity-80 transition-opacity hover:opacity-100',
        className
      )}
      role="toolbar"
      aria-label={isAr ? 'تحكم بالرسوم المتحركة' : 'Animation controls'}
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
