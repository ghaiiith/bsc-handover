'use client'

import { useTranslations } from 'next-intl'
import { Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PlayerOverlayShell from '@/components/video-player/PlayerOverlayShell'
import { formatPlaybackTime } from '@/lib/playback/preferences'

interface PlayerResumePromptProps {
  positionSeconds: number
  onResume: () => void
  onStartOver: () => void
}

export default function PlayerResumePrompt({
  positionSeconds,
  onResume,
  onStartOver,
}: PlayerResumePromptProps) {
  const t = useTranslations('video_player')

  return (
    <PlayerOverlayShell variant="toast" className="gap-3">
      <p className="text-sm font-semibold text-white">{t('resume_prompt_title')}</p>
      <p className="max-w-xs text-xs leading-relaxed text-white/55">
        {t('resume_prompt_message', { time: formatPlaybackTime(positionSeconds) })}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary/90"
          onClick={onResume}
        >
          <Play className="h-3.5 w-3.5" />
          {t('resume_from', { time: formatPlaybackTime(positionSeconds) })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-lg border-white/25 bg-transparent text-white hover:bg-white/10"
          onClick={onStartOver}
        >
          <RotateCcw className="me-1.5 h-3.5 w-3.5" />
          {t('start_from_beginning')}
        </Button>
      </div>
    </PlayerOverlayShell>
  )
}
