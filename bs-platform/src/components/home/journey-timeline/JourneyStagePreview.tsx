'use client'

import { memo, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Check,
  MapPin,
  MessageCircle,
  Play,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react'
import type { JourneyCardType } from '@/components/home/journey-timeline/journey-stages'
import { JOURNEY_PREVIEW_HEIGHT_PX } from '@/components/home/journey-timeline/journey-stages'

interface JourneyStagePreviewProps {
  cardType: JourneyCardType
  accentColor: string
  reducedMotion?: boolean
  stageKey: string
}

const PREVIEW_SHELL = 'flex h-full w-full flex-col justify-center overflow-hidden'

function CoursePreview({
  accentColor,
  reducedMotion,
}: {
  accentColor: string
  reducedMotion: boolean
}) {
  return (
    <div className={`${PREVIEW_SHELL} gap-2`}>
      <div
        className="relative flex h-20 shrink-0 items-center justify-center overflow-hidden rounded-xl"
        style={{ background: `${accentColor}18` }}
      >
        <motion.div
          className="flex size-12 items-center justify-center rounded-full bg-background/90 shadow-md"
          animate={reducedMotion ? {} : { scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play className="size-5" style={{ color: accentColor }} fill={accentColor} />
        </motion.div>
        <span className="absolute end-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">
          12 lessons
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-3/4 rounded-full bg-foreground/15" />
        <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accentColor }}
            initial={reducedMotion ? { width: '35%' } : { width: 0 }}
            animate={{ width: '35%' }}
            transition={{ duration: 1.2, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

function SkillsPreview({
  accentColor,
  reducedMotion,
}: {
  accentColor: string
  reducedMotion: boolean
}) {
  const items = ['React', 'UI Design', 'Communication']
  return (
    <div className={`${PREVIEW_SHELL} gap-1.5`}>
      {items.map((item, i) => (
        <motion.div
          key={item}
          initial={reducedMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 * i }}
          className="flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-1.5"
        >
          <motion.span
            className="flex size-5 items-center justify-center rounded-full"
            style={{ background: `${accentColor}22` }}
            initial={reducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
          >
            <Check className="size-3" style={{ color: accentColor }} />
          </motion.span>
          <span className="text-xs font-medium">{item}</span>
        </motion.div>
      ))}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="relative size-9 shrink-0">
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
            <motion.circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={accentColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${reducedMotion ? 72 : 0} 100`}
              initial={reducedMotion ? false : { strokeDasharray: '0 100' }}
              animate={{ strokeDasharray: '72 100' }}
              transition={{ duration: 1.2, delay: 0.4 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
            72%
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Skill progress</span>
      </div>
    </div>
  )
}

function CertificatePreview({
  accentColor,
  reducedMotion,
}: {
  accentColor: string
  reducedMotion: boolean
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${PREVIEW_SHELL} rounded-xl border-2 border-dashed p-3`}
      style={{ borderColor: `${accentColor}50` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="h-2 w-24 rounded-full" style={{ background: accentColor }} />
          <div className="h-1.5 w-32 rounded-full bg-foreground/15" />
          <div className="h-1.5 w-20 rounded-full bg-foreground/10" />
        </div>
        <motion.div
          initial={reducedMotion ? false : { scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.5 }}
          className="flex size-10 items-center justify-center rounded-full"
          style={{ background: `${accentColor}20` }}
        >
          <ShieldCheck className="size-5" style={{ color: accentColor }} />
        </motion.div>
      </div>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: `${accentColor}18`, color: accentColor }}
      >
        <Check className="size-3" /> Verified
      </motion.div>
    </motion.div>
  )
}

function JobPreview({
  accentColor,
  reducedMotion,
}: {
  accentColor: string
  reducedMotion: boolean
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`${PREVIEW_SHELL} gap-2 rounded-xl border bg-background/70 p-3 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accentColor}20` }}
        >
          <Briefcase className="size-5" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-2.5 w-3/4 rounded-full bg-foreground/20" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>Baghdad</span>
          </div>
        </div>
      </div>
      <motion.span
        initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: `${accentColor}18`, color: accentColor }}
      >
        Matched
      </motion.span>
      <motion.button
        type="button"
        className="w-full shrink-0 rounded-lg py-1.5 text-xs font-semibold text-white"
        style={{ background: accentColor }}
        animate={reducedMotion ? {} : { boxShadow: [`0 0 0 0 ${accentColor}00`, `0 0 12px 2px ${accentColor}40`, `0 0 0 0 ${accentColor}00`] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Apply
      </motion.button>
    </motion.div>
  )
}

function ServicePreview({
  accentColor,
  reducedMotion,
}: {
  accentColor: string
  reducedMotion: boolean
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${PREVIEW_SHELL} gap-2 rounded-xl border bg-background/70 p-3`}
    >
      <div className="h-2.5 w-2/3 rounded-full bg-foreground/20" />
      <div className="flex flex-wrap gap-1">
        {['Design', 'Dev'].map((chip, i) => (
          <span
            key={chip}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: i === 0 ? `${accentColor}18` : '#22C55E18', color: i === 0 ? accentColor : '#22C55E' }}
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={reducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.08 }}
            >
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
            </motion.div>
          ))}
        </div>
        <span className="text-sm font-bold" style={{ color: accentColor }}>
          $120
        </span>
      </div>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5"
      >
        <MessageCircle className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">New order</span>
      </motion.div>
    </motion.div>
  )
}

function GrowthPreview({
  accentColor,
  reducedMotion,
}: {
  accentColor: string
  reducedMotion: boolean
}) {
  return (
    <div className={`${PREVIEW_SHELL} gap-2`}>
      <svg viewBox="0 0 200 80" className="h-16 w-full shrink-0">
        <motion.path
          d="M10 70 L50 55 L90 48 L130 30 L190 12"
          fill="none"
          stroke={accentColor}
          strokeWidth="3"
          strokeLinecap="round"
          initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2 }}
        />
        {[10, 50, 90, 130, 190].map((x, i) => (
          <motion.circle
            key={x}
            cx={x}
            cy={[70, 55, 48, 30, 12][i]}
            r="4"
            fill={accentColor}
            initial={reducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.15 }}
          />
        ))}
      </svg>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-4" style={{ color: accentColor }} />
          <span className="text-sm font-semibold">+48% growth</span>
        </div>
        <motion.span
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.8 }}
          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: accentColor }}
        >
          Success
        </motion.span>
      </div>
    </div>
  )
}

const PREVIEW_MAP: Record<
  JourneyCardType,
  ComponentType<{ accentColor: string; reducedMotion: boolean }>
> = {
  course: CoursePreview,
  skills: SkillsPreview,
  certificate: CertificatePreview,
  job: JobPreview,
  service: ServicePreview,
  growth: GrowthPreview,
}

function JourneyStagePreview({
  cardType,
  accentColor,
  reducedMotion = false,
  stageKey,
}: JourneyStagePreviewProps) {
  const Preview = PREVIEW_MAP[cardType]

  return (
    <motion.div
      key={stageKey}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.45 }}
      className="h-full w-full"
      style={{
        height: JOURNEY_PREVIEW_HEIGHT_PX,
        minHeight: JOURNEY_PREVIEW_HEIGHT_PX,
        maxHeight: JOURNEY_PREVIEW_HEIGHT_PX,
      }}
    >
      <Preview accentColor={accentColor} reducedMotion={reducedMotion} />
    </motion.div>
  )
}

export default memo(JourneyStagePreview)
