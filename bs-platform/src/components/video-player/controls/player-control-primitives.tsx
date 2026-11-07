'use client'

import { cn } from '@/lib/utils'
import {
  PLAYER_GROUP_GAP,
  PLAYER_ICON,
  PLAYER_ICON_PRIMARY,
  playerMenuTrigger,
  playerTooltipArrow,
  playerTooltipSurface,
} from '@/components/video-player/player-ui-styles'

interface PlayerControlTooltipProps {
  label: string
  children: React.ReactNode
  side?: 'top' | 'bottom'
}

export function PlayerControlTooltip({
  label,
  children,
  side = 'top',
}: PlayerControlTooltipProps) {
  return (
    <div className="group/tip relative inline-flex">
      {children}
      <span role="tooltip" className={cn(playerTooltipSurface, side === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2.5')}>
        {label}
        <span
          className={cn(
            playerTooltipArrow,
            side === 'top'
              ? 'top-full border-t-neutral-900/95'
              : 'bottom-full border-b-neutral-900/95'
          )}
          aria-hidden
        />
      </span>
    </div>
  )
}

interface ControlGroupProps {
  children: React.ReactNode
  className?: string
  'aria-label'?: string
}

export function ControlGroup({ children, className, 'aria-label': ariaLabel }: ControlGroupProps) {
  return (
    <div
      className={cn('flex items-center', PLAYER_GROUP_GAP, className)}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

export function ControlSectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn('mx-0.5 hidden h-7 w-px shrink-0 bg-white/12 sm:block', className)}
      aria-hidden
    />
  )
}

interface PlayerControlButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary'
  disabled?: boolean
  className?: string
}

const VARIANT_STYLES: Record<NonNullable<PlayerControlButtonProps['variant']>, string> = {
  primary:
    'h-12 w-12 rounded-full bg-white/15 text-white hover:bg-white/25 active:bg-white/20',
  secondary:
    'h-9 w-9 rounded-lg text-white/90 hover:bg-white/12 hover:text-white',
  tertiary:
    'h-8 w-8 rounded-lg text-white/65 hover:bg-white/10 hover:text-white/90',
}

export function PlayerControlButton({
  label,
  onClick,
  children,
  variant = 'secondary',
  disabled = false,
  className,
}: PlayerControlButtonProps) {
  return (
    <PlayerControlTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
          'active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
          'disabled:pointer-events-none disabled:opacity-35',
          VARIANT_STYLES[variant],
          className
        )}
      >
        {children}
      </button>
    </PlayerControlTooltip>
  )
}

interface PlayerMenuButtonProps {
  label: string
  children: React.ReactNode
  className?: string
  active?: boolean
}

export function PlayerMenuButton({
  label,
  children,
  className,
  active = false,
}: PlayerMenuButtonProps) {
  return (
    <PlayerControlTooltip label={label}>
      <span
        role="presentation"
        className={cn(
          playerMenuTrigger,
          active && 'bg-white/15 text-white',
          className
        )}
      >
        {children}
      </span>
    </PlayerControlTooltip>
  )
}

export { PLAYER_ICON, PLAYER_ICON_PRIMARY }
