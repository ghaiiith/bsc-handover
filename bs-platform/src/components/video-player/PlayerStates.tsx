'use client'

import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlatformPlaybackErrorCode } from '@/types/video-player'

const ERROR_KEYS: Record<PlatformPlaybackErrorCode, string> = {
  network_lost: 'errors.network_lost',
  unavailable: 'errors.unavailable',
  permission_denied: 'errors.permission_denied',
  processing: 'errors.processing',
  restricted: 'errors.restricted',
  session_expired: 'errors.session_expired',
}

interface PlayerLoadingStateProps {
  poster?: string | null
  className?: string
}

export function PlayerLoadingState({ poster, className }: PlayerLoadingStateProps) {
  return (
    <div
      className={`relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted ${className ?? ''}`}
    >
      {poster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm"
        />
      )}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/10 to-transparent" />
      <Loader2 className="relative z-10 h-10 w-10 animate-spin text-primary" />
    </div>
  )
}

interface PlayerErrorStateProps {
  errorCode: PlatformPlaybackErrorCode
  onRetry: () => void
  onRefresh?: () => void
  className?: string
}

export function PlayerErrorState({
  errorCode,
  onRetry,
  onRefresh,
  className,
}: PlayerErrorStateProps) {
  const t = useTranslations('video_player')

  return (
    <div
      className={`flex aspect-video w-full flex-col items-center justify-center gap-4 bg-muted px-6 text-center ${className ?? ''}`}
    >
      <p className="text-sm font-medium text-foreground">
        {t(ERROR_KEYS[errorCode] as 'errors.network_lost')}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="default" size="sm" onClick={onRetry}>
          <RefreshCw className="me-2 h-4 w-4" />
          {t('retry')}
        </Button>
        {onRefresh && (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            {t('refresh_playback')}
          </Button>
        )}
      </div>
    </div>
  )
}
