'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useInView } from 'framer-motion'
import {
  getJourneyStage,
  getJourneyStageIndex,
  JOURNEY_CARD_HEIGHT_PX,
  JOURNEY_STAGE_ORDER,
  JOURNEY_STAGES,
  stageLabel,
  type JourneyStageId,
} from '@/components/home/journey-timeline/journey-stages'
import JourneyProgressLine from '@/components/home/journey-timeline/JourneyProgressLine'
import JourneyTimelineCard from '@/components/home/journey-timeline/JourneyTimelineCard'
import JourneyTimelineStage from '@/components/home/journey-timeline/JourneyTimelineStage'
import { useJourneyTimeline } from '@/components/home/journey-timeline/useJourneyTimeline'
import { useReducedMotionPreference } from '@/components/home/journey-timeline/useReducedMotionPreference'
import { cn } from '@/lib/utils'

/** Re-export for consumers */
export { JOURNEY_CARD_HEIGHT_PX, JOURNEY_PREVIEW_HEIGHT_PX } from '@/components/home/journey-timeline/journey-stages'

export interface HeroJourneyTimelineProps {
  locale: string
  dir?: 'ltr' | 'rtl'
  autoPlay?: boolean
  loop?: boolean
  initialStage?: JourneyStageId
  onStageChange?: (id: JourneyStageId) => void
  /** @deprecated Controls removed — prop ignored for backward compatibility */
  showControls?: boolean
  className?: string
}

export default function HeroJourneyTimeline({
  locale,
  dir = 'ltr',
  autoPlay = true,
  loop = true,
  initialStage = 'learn',
  onStageChange,
  className,
}: HeroJourneyTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: '-60px', amount: 0.2 })
  const reducedMotion = useReducedMotionPreference()
  const [manualHold, setManualHold] = useState(false)

  const { stageId, goToStage } = useJourneyTimeline({
    autoPlay,
    loop,
    initialStage,
    isInView,
    reducedMotion,
    manualHold,
    onStageChange,
  })

  const stage = useMemo(() => getJourneyStage(stageId), [stageId])
  const activeIndex = getJourneyStageIndex(stageId)
  const progress =
    JOURNEY_STAGE_ORDER.length > 1
      ? activeIndex / (JOURNEY_STAGE_ORDER.length - 1)
      : 0

  const handleSelectStage = useCallback(
    (id: JourneyStageId) => {
      setManualHold(true)
      goToStage(id, true)
      window.setTimeout(() => setManualHold(false), 5000)
    },
    [goToStage]
  )

  const ariaLabel =
    locale === 'ar'
      ? 'جدول زمني تفاعلي لرحلة التعلم والعمل على المنصة'
      : 'Interactive timeline of the learn-to-career platform journey'

  return (
    <div
      ref={containerRef}
      className={cn('flex w-full max-w-xl flex-col', className)}
      aria-label={ariaLabel}
      role="region"
    >
      <div
        className={cn(
          'overflow-hidden rounded-3xl border border-border/50 p-3 md:p-4',
          'bg-gradient-to-br from-muted/30 via-background/80 to-primary/5',
          'shadow-sm dark:from-muted/10 dark:via-background/40 dark:to-primary/5'
        )}
        style={{ minHeight: JOURNEY_CARD_HEIGHT_PX + 88 }}
      >
        <div
          className="overflow-hidden"
          style={{ height: JOURNEY_CARD_HEIGHT_PX }}
        >
          <AnimatePresence mode="wait">
            <div key={stageId} className="h-full">
              <JourneyTimelineCard
                stage={stage}
                locale={locale}
                reducedMotion={reducedMotion}
                isFinalStage={stageId === 'advance'}
              />
            </div>
          </AnimatePresence>
        </div>

        <nav
          className="mt-4"
          aria-label={locale === 'ar' ? 'مراحل الرحلة' : 'Journey steps'}
          dir={dir}
        >
          <div className="relative mb-2 hidden sm:block">
            <JourneyProgressLine
              progress={progress}
              dir={dir}
              accentColor={stage.accentColor}
              reducedMotion={reducedMotion}
            />
          </div>

          <div
            className={cn(
              'flex items-start gap-0.5 overflow-x-auto pb-1 scrollbar-none sm:gap-1',
              dir === 'rtl' && 'flex-row-reverse'
            )}
          >
            {JOURNEY_STAGES.map((s) => {
              const idx = getJourneyStageIndex(s.id)
              const isActive = s.id === stageId
              const isCompleted = idx < activeIndex
              return (
                <JourneyTimelineStage
                  key={s.id}
                  order={s.order}
                  label={stageLabel(s, locale)}
                  icon={s.icon}
                  accentColor={s.accentColor}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  isUpcoming={idx > activeIndex}
                  onSelect={() => handleSelectStage(s.id)}
                  ariaLabel={`${stageLabel(s, locale)} — ${locale === 'ar' ? 'المرحلة' : 'Stage'} ${s.order}`}
                />
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
