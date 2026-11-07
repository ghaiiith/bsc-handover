'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import type { JourneyStage } from '@/components/home/journey-timeline/journey-stages'
import { stageDescription, stageTitle } from '@/components/home/journey-timeline/journey-stages'
import { JOURNEY_PREVIEW_HEIGHT_PX } from '@/components/home/journey-timeline/journey-stages'
import JourneyFloatingElements from '@/components/home/journey-timeline/JourneyFloatingElements'
import JourneyStagePreview from '@/components/home/journey-timeline/JourneyStagePreview'
import { cn } from '@/lib/utils'

interface JourneyTimelineCardProps {
  stage: JourneyStage
  locale: string
  reducedMotion?: boolean
  isFinalStage?: boolean
}

function JourneyTimelineCard({
  stage,
  locale,
  reducedMotion = false,
  isFinalStage = false,
}: JourneyTimelineCardProps) {
  const Icon = stage.icon

  return (
    <motion.div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-md md:p-5',
        'dark:border-border/40 dark:bg-card/50',
        isFinalStage && !reducedMotion && 'ring-1 ring-primary/20'
      )}
      animate={
        isFinalStage && !reducedMotion
          ? {
              boxShadow: [
                '0 0 0 0 rgba(249,115,22,0)',
                '0 0 24px 4px rgba(249,115,22,0.12)',
                '0 0 0 0 rgba(249,115,22,0)',
              ],
            }
          : {}
      }
      transition={{ duration: 2.5, repeat: isFinalStage ? Infinity : 0 }}
    >
      <JourneyFloatingElements
        stageId={stage.id}
        accentColor={stage.accentColor}
        reducedMotion={reducedMotion}
      />

      <div className="relative z-10 mb-3 flex h-12 shrink-0 items-center gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${stage.accentColor}18` }}
        >
          <Icon className="size-4" style={{ color: stage.accentColor }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold md:text-base">
            {stageTitle(stage, locale)}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {stageDescription(stage, locale)}
          </p>
        </div>
      </div>

      <div
        className="relative z-10 flex flex-1 items-center overflow-hidden"
        style={{ height: JOURNEY_PREVIEW_HEIGHT_PX, minHeight: JOURNEY_PREVIEW_HEIGHT_PX, maxHeight: JOURNEY_PREVIEW_HEIGHT_PX }}
      >
        <JourneyStagePreview
          cardType={stage.cardType}
          accentColor={stage.accentColor}
          reducedMotion={reducedMotion}
          stageKey={stage.id}
        />
      </div>
    </motion.div>
  )
}

export default memo(JourneyTimelineCard)
