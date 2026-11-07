'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

interface HeroSketchBackgroundProps {
  tint: string
  accentColor: string
  sceneKey: string
  reducedMotion?: boolean
}

function HeroSketchBackground({
  tint,
  accentColor,
  sceneKey,
  reducedMotion = false,
}: HeroSketchBackgroundProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      aria-hidden
    >
      <motion.div
        key={sceneKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 60% 40%, ${tint}, transparent 70%)` }}
      />

      <svg
        className="absolute inset-0 h-full w-full text-foreground/10 dark:text-foreground/15"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
      >
        <motion.path
          d="M30 220 Q120 180 200 200 T370 170"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
        <motion.path
          d="M320 60 L350 45 L340 75 Z"
          fill="none"
          stroke={accentColor}
          strokeWidth="1.2"
          opacity={0.35}
          animate={reducedMotion ? {} : { opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <circle cx="60" cy="70" r="28" fill="currentColor" opacity={0.04} />
        <circle cx="340" cy="240" r="40" fill="currentColor" opacity={0.03} />
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={90 + i * 24}
            cy={50 + i * 8}
            r="2"
            fill={accentColor}
            opacity={0.4}
            animate={reducedMotion ? {} : { opacity: [0.2, 0.7, 0.2], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </svg>
    </div>
  )
}

export default memo(HeroSketchBackground)
