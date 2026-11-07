'use client'

import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface JourneyTimelineStageProps {
  order: number
  label: string
  icon: LucideIcon
  accentColor: string
  isActive: boolean
  isCompleted: boolean
  isUpcoming: boolean
  onSelect: () => void
  compact?: boolean
  ariaLabel: string
}

function JourneyTimelineStage({
  order,
  label,
  icon: Icon,
  accentColor,
  isActive,
  isCompleted,
  onSelect,
  compact = false,
  ariaLabel,
}: JourneyTimelineStageProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={ariaLabel}
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive && 'bg-primary/5'
      )}
    >
      <motion.span
        layout
        className={cn(
          'relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors md:size-8',
          isActive
            ? 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/25'
            : isCompleted
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-muted-foreground/20 bg-muted text-muted-foreground'
        )}
      >
        {isCompleted && !isActive ? (
          <Check className="size-3.5 md:size-4" />
        ) : (
          <Icon className="size-3.5 md:size-4" strokeWidth={2} />
        )}
        <span className="sr-only">{order}</span>
      </motion.span>
      {!compact && (
        <span
          className={cn(
            'max-w-full truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px] md:text-xs',
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
          style={isActive ? { color: accentColor } : undefined}
        >
          {label}
        </span>
      )}
    </button>
  )
}

export default memo(JourneyTimelineStage)
