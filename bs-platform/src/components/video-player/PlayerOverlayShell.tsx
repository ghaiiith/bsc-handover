'use client'

import { cn } from '@/lib/utils'
import {
  playerOverlayDim,
  playerOverlayFullscreen,
  playerOverlayPanel,
  playerOverlayToast,
} from '@/components/video-player/player-ui-styles'

type PlayerOverlayVariant = 'fullscreen' | 'panel' | 'toast' | 'dim'

interface PlayerOverlayShellProps {
  variant: PlayerOverlayVariant
  children: React.ReactNode
  className?: string
  role?: string
  'aria-label'?: string
  'aria-live'?: 'polite' | 'assertive' | 'off'
}

const VARIANT_CLASS: Record<PlayerOverlayVariant, string> = {
  fullscreen: playerOverlayFullscreen,
  panel: playerOverlayPanel,
  toast: playerOverlayToast,
  dim: playerOverlayDim,
}

export default function PlayerOverlayShell({
  variant,
  children,
  className,
  role,
  'aria-label': ariaLabel,
  'aria-live': ariaLive,
}: PlayerOverlayShellProps) {
  return (
    <div
      className={cn(VARIANT_CLASS[variant], className)}
      role={role}
      aria-label={ariaLabel}
      aria-live={ariaLive}
    >
      {children}
    </div>
  )
}
