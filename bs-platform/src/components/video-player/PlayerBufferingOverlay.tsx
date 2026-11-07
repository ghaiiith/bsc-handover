'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import PlayerOverlayShell from '@/components/video-player/PlayerOverlayShell'

interface PlayerBufferingOverlayProps {
  visible: boolean
  isOnline?: boolean
}

export default function PlayerBufferingOverlay({
  visible,
  isOnline = true,
}: PlayerBufferingOverlayProps) {
  const t = useTranslations('video_player')

  if (!visible) return null

  return (
    <PlayerOverlayShell
      variant="dim"
      role="status"
      aria-live="polite"
      aria-label={t('buffering')}
    >
      <Loader2 className="h-12 w-12 animate-spin text-white/90" aria-hidden />
      <p className="mt-4 text-sm font-medium text-white/90">{t('buffering')}</p>
      {!isOnline && (
        <p className="mt-1 text-xs text-white/55">{t('waiting_for_connection')}</p>
      )}
    </PlayerOverlayShell>
  )
}
