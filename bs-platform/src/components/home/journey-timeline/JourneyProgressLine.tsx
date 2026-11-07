'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

interface JourneyProgressLineProps {
  progress: number
  dir: 'ltr' | 'rtl'
  accentColor: string
  reducedMotion?: boolean
}

function JourneyProgressLine({
  progress,
  dir,
  accentColor,
  reducedMotion = false,
}: JourneyProgressLineProps) {
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div
      className="relative h-1 w-full overflow-hidden rounded-full bg-muted"
      aria-hidden
    >
      <motion.div
        className="absolute inset-y-0 rounded-full"
        style={{
          background: `linear-gradient(${dir === 'rtl' ? '270deg' : '90deg'}, ${accentColor}, ${accentColor}cc)`,
          width: `${clamped * 100}%`,
          ...(dir === 'rtl' ? { right: 0, left: 'auto' } : { left: 0 }),
        }}
        initial={false}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default memo(JourneyProgressLine)
