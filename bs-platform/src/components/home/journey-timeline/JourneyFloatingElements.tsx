'use client'

import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { JourneyStageId } from '@/components/home/journey-timeline/journey-stages'
import {
  Award,
  Briefcase,
  MessageCircle,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react'

interface JourneyFloatingElementsProps {
  stageId: JourneyStageId
  accentColor: string
  reducedMotion?: boolean
}

const STAGE_FLOATS: Record<
  JourneyStageId,
  Array<{ icon: typeof Award; className: string }>
> = {
  learn: [
    { icon: Award, className: 'top-[6%] end-[8%]' },
    { icon: Star, className: 'bottom-[18%] start-[6%]' },
  ],
  skills: [
    { icon: ShieldCheck, className: 'top-[10%] start-[10%]' },
    { icon: TrendingUp, className: 'bottom-[20%] end-[6%]' },
  ],
  certified: [
    { icon: ShieldCheck, className: 'top-[8%] end-[10%]' },
    { icon: Award, className: 'bottom-[22%] start-[8%]' },
  ],
  work: [
    { icon: Briefcase, className: 'top-[12%] start-[6%]' },
    { icon: Star, className: 'bottom-[16%] end-[10%]' },
  ],
  services: [
    { icon: MessageCircle, className: 'top-[8%] end-[6%]' },
    { icon: Star, className: 'bottom-[20%] start-[10%]' },
  ],
  advance: [
    { icon: TrendingUp, className: 'top-[6%] start-[8%]' },
    { icon: Award, className: 'bottom-[14%] end-[8%]' },
  ],
}

function JourneyFloatingElements({
  stageId,
  accentColor,
  reducedMotion = false,
}: JourneyFloatingElementsProps) {
  const floats = STAGE_FLOATS[stageId].slice(0, 3)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.div
          key={stageId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          {floats.map(({ icon: Icon, className }, i) => (
            <motion.div
              key={`${stageId}-${i}`}
              className={`absolute flex size-8 items-center justify-center rounded-lg border bg-card/60 opacity-40 shadow-sm backdrop-blur-sm md:size-9 ${className}`}
              animate={
                reducedMotion
                  ? {}
                  : { y: [0, -5, 0], opacity: [0.35, 0.55, 0.35] }
              }
              transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.3 }}
            >
              <Icon className="size-3.5 md:size-4" style={{ color: accentColor }} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default memo(JourneyFloatingElements)
