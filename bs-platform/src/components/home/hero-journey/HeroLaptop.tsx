'use client'

import { memo, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LaptopContent } from '@/components/home/hero-journey/hero-scenes'
import { cn } from '@/lib/utils'

interface HeroLaptopProps {
  content: LaptopContent
  accentColor: string
  reducedMotion?: boolean
}

function ScreenVideo({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <div
        className="flex flex-1 items-center justify-center rounded-sm"
        style={{ background: `${accentColor}22` }}
      >
        <motion.div
          className="flex size-7 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-white/20"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            className="ms-0.5 size-0 border-y-[5px] border-s-[8px] border-y-transparent"
            style={{ borderLeftColor: accentColor }}
          />
        </motion.div>
      </div>
      <div className="h-1.5 w-3/4 rounded-full bg-foreground/15" />
      <div className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
    </div>
  )
}

function ScreenCertificate({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded border-2 border-dashed p-2"
        style={{ borderColor: accentColor }}
      >
        <div className="h-2 w-12 rounded-full" style={{ background: accentColor }} />
        <div className="mt-1 h-1 w-8 rounded-full bg-foreground/20" />
      </motion.div>
      <motion.div
        className="h-1 rounded-full bg-emerald-500/60"
        initial={{ width: 0 }}
        animate={{ width: '70%' }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
    </div>
  )
}

function ScreenJobCard({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex h-full flex-col gap-1.5 p-2">
      <div className="rounded-sm border border-foreground/15 p-1.5">
        <div className="h-1.5 w-2/3 rounded-full" style={{ background: accentColor }} />
        <div className="mt-1 h-1 w-1/2 rounded-full bg-foreground/15" />
      </div>
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-1"
      >
        <div className="size-2 rounded-full bg-emerald-500" />
        <div className="h-1 w-8 rounded-full bg-foreground/20" />
      </motion.div>
    </div>
  )
}

function ScreenDashboard({ accentColor }: { accentColor: string }) {
  return (
    <div className="grid h-full grid-cols-2 gap-1 p-2">
      <div className="rounded-sm bg-foreground/8 p-1">
        <div className="h-1 w-full rounded-full bg-foreground/15" />
        <motion.div
          className="mt-1 flex items-end gap-0.5"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
        >
          {[40, 65, 45, 80].map((h, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-t-sm"
              style={{ background: accentColor, height: `${h}%`, maxHeight: 20 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            />
          ))}
        </motion.div>
      </div>
      <div className="space-y-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1 rounded-full bg-foreground/12" />
        ))}
      </div>
    </div>
  )
}

function ScreenServices({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex h-full gap-1 p-1.5">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          className="flex-1 rounded-sm border border-foreground/12 p-1"
        >
          <div
            className="mb-1 h-1.5 w-full rounded-full"
            style={{ background: i === 0 ? accentColor : '#22C55E' }}
          />
          <div className="flex gap-0.5">
            {[0, 1, 2].map((s) => (
              <div key={s} className="size-1 rounded-full bg-amber-400" />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ScreenGrowth({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-2">
      <motion.svg viewBox="0 0 60 30" className="h-10 w-full">
        <motion.path
          d="M4 26 L20 18 L32 22 L56 6"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2 }}
        />
        <motion.circle
          cx="56"
          cy="6"
          r="3"
          fill={accentColor}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
        />
      </motion.svg>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-1 text-[6px] font-semibold"
        style={{ color: accentColor }}
      >
        ↑
      </motion.div>
    </div>
  )
}

const SCREEN_MAP: Record<LaptopContent, ComponentType<{ accentColor: string }>> = {
  video: ScreenVideo,
  certificate: ScreenCertificate,
  'job-card': ScreenJobCard,
  dashboard: ScreenDashboard,
  services: ScreenServices,
  growth: ScreenGrowth,
}

function HeroLaptop({ content, accentColor, reducedMotion = false }: HeroLaptopProps) {
  const Screen = SCREEN_MAP[content]

  return (
    <g transform="translate(118, 108)">
      <rect
        x="0"
        y="18"
        width="88"
        height="6"
        rx="2"
        className="fill-foreground/20"
      />
      <rect
        x="4"
        y="0"
        width="80"
        height="52"
        rx="4"
        className="fill-card stroke-foreground/25"
        strokeWidth="1.5"
      />
      <foreignObject x="6" y="2" width="76" height="48">
        <div className={cn('h-full w-full overflow-hidden rounded-sm bg-muted/40')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={content}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="h-full w-full"
            >
              <Screen accentColor={accentColor} />
            </motion.div>
          </AnimatePresence>
        </div>
      </foreignObject>
      {!reducedMotion && (
        <motion.rect
          x="6"
          y="2"
          width="76"
          height="48"
          rx="2"
          fill={accentColor}
          opacity={0}
          animate={{ opacity: [0, 0.06, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </g>
  )
}

export default memo(HeroLaptop)
