'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import {
  getSceneById,
  HERO_SCENES,
  type HeroSceneId,
} from '@/components/home/hero-journey/hero-scenes'
import HeroAnimationControls from '@/components/home/hero-journey/HeroAnimationControls'
import HeroJourneyScene from '@/components/home/hero-journey/HeroJourneyScene'
import HeroSceneTimeline from '@/components/home/hero-journey/HeroSceneTimeline'
import { useHeroSceneCycle } from '@/components/home/hero-journey/useHeroSceneCycle'
import { useReducedMotionPreference } from '@/components/home/hero-journey/useReducedMotionPreference'
import { cn } from '@/lib/utils'

export interface HeroJourneyAnimationProps {
  locale: string
  dir?: 'ltr' | 'rtl'
  autoPlay?: boolean
  loop?: boolean
  initialScene?: HeroSceneId
  showControls?: boolean
  showTimeline?: boolean
  reducedMotionFallback?: boolean
  className?: string
}

export default function HeroJourneyAnimation({
  locale,
  dir = 'ltr',
  autoPlay = true,
  loop = true,
  initialScene = 'learning',
  showControls = true,
  showTimeline = true,
  reducedMotionFallback = true,
  className,
}: HeroJourneyAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: '-80px', amount: 0.25 })
  const systemReducedMotion = useReducedMotionPreference()
  const reducedMotion = reducedMotionFallback && systemReducedMotion

  const [userPaused, setUserPaused] = useState(false)
  const [skipped, setSkipped] = useState(false)

  const { sceneId, goToScene, replay, skip } = useHeroSceneCycle({
    autoPlay,
    loop,
    initialScene,
    isInView,
    reducedMotion,
    userPaused,
    skipped,
  })

  const scene = useMemo(() => getSceneById(sceneId), [sceneId])

  const handleTogglePause = useCallback(() => {
    setUserPaused((p) => !p)
  }, [])

  const handleReplay = useCallback(() => {
    setSkipped(false)
    setUserPaused(false)
    replay()
  }, [replay])

  const handleSkip = useCallback(() => {
    setSkipped(true)
    setUserPaused(true)
    skip()
  }, [skip])

  const handleSelectScene = useCallback(
    (id: HeroSceneId) => {
      setSkipped(false)
      goToScene(id)
    },
    [goToScene]
  )

  const ariaLabel =
    locale === 'ar'
      ? 'رسم توضيحي متحرك لرحلة التعلم والعمل على المنصة'
      : 'Animated illustration of the learn-to-career journey on the platform'

  return (
    <div
      ref={containerRef}
      className={cn('flex w-full max-w-lg flex-col gap-3', className)}
      aria-label={ariaLabel}
      role="img"
    >
      <div
        className={cn(
          'relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/60',
          'bg-gradient-to-br from-card/80 via-background/50 to-muted/30',
          'shadow-sm backdrop-blur-sm'
        )}
      >
        <HeroJourneyScene
          scene={scene}
          locale={locale}
          reducedMotion={reducedMotion}
        />
      </div>

      {showTimeline && (
        <HeroSceneTimeline
          scenes={HERO_SCENES}
          activeSceneId={sceneId}
          locale={locale}
          dir={dir}
          onSelect={handleSelectScene}
          compact={false}
        />
      )}

      {showControls && !reducedMotion && (
        <HeroAnimationControls
          locale={locale}
          isPaused={userPaused}
          onTogglePause={handleTogglePause}
          onReplay={handleReplay}
          onSkip={handleSkip}
        />
      )}
    </div>
  )
}
