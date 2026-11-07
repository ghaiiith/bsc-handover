'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, LogIn, Play, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PlayerOverlayShell from '@/components/video-player/PlayerOverlayShell'
import { playerEndScreenButtonBase } from '@/components/video-player/player-ui-styles'
import { cn } from '@/lib/utils'

interface SessionExpiredOverlayProps {
  locale: string
  isRenewing: boolean
  onResume: () => void
  onRetry: () => void
}

export default function SessionExpiredOverlay({
  locale,
  isRenewing,
  onResume,
  onRetry,
}: SessionExpiredOverlayProps) {
  const t = useTranslations('video_player')

  return (
    <PlayerOverlayShell
      variant="fullscreen"
      className="z-50"
      role="dialog"
      aria-label={t('session_expired_title')}
    >
      <p className="text-lg font-semibold text-white">{t('session_expired_title')}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
        {t('session_expired_message')}
      </p>
      <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">
        <Button
          type="button"
          onClick={onResume}
          disabled={isRenewing}
          className={cn(
            playerEndScreenButtonBase,
            'gap-2 bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isRenewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {t('resume_playback')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={isRenewing}
          className={cn(
            playerEndScreenButtonBase,
            'border-white/35 bg-transparent text-white hover:bg-white/10'
          )}
        >
          <RefreshCw className="me-2 h-4 w-4" />
          {t('retry')}
        </Button>
        <Link
          href={`/${locale}/login`}
          className={cn(
            playerEndScreenButtonBase,
            'inline-flex items-center justify-center gap-2 text-white/70 hover:bg-white/5 hover:text-white'
          )}
        >
          <LogIn className="h-4 w-4" />
          {t('sign_in_again')}
        </Link>
      </div>
    </PlayerOverlayShell>
  )
}
