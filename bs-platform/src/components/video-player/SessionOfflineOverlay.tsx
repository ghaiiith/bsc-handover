'use client'

import { useTranslations } from 'next-intl'
import { Loader2, WifiOff } from 'lucide-react'
import PlayerOverlayShell from '@/components/video-player/PlayerOverlayShell'

interface SessionOfflineOverlayProps {
  locale: string
}

export default function SessionOfflineOverlay({ locale: _locale }: SessionOfflineOverlayProps) {
  const t = useTranslations('video_player')

  return (
    <PlayerOverlayShell variant="fullscreen" role="status" aria-live="polite">
      <WifiOff className="mb-4 h-10 w-10 text-white/70" aria-hidden />
      <p className="text-lg font-semibold text-white">{t('waiting_for_connection')}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
        {t('waiting_for_connection_message')}
      </p>
      <Loader2 className="mt-5 h-5 w-5 animate-spin text-white/45" aria-hidden />
    </PlayerOverlayShell>
  )
}
