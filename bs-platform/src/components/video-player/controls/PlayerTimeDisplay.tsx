'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { formatPlaybackTimeTabular } from '@/lib/playback/preferences'

interface PlayerTimeDisplayProps {
  currentTime: number
  duration: number
}

function PlayerTimeDisplayComponent({ currentTime, duration }: PlayerTimeDisplayProps) {
  const t = useTranslations('video_player')
  const remaining = Math.max(0, duration - currentTime)

  return (
    <div
      className="flex min-w-[5.5rem] flex-col items-center text-center tabular-nums"
      aria-label={t('time_display')}
    >
      <div className="text-xs font-medium tracking-wide text-white">
        <span>{formatPlaybackTimeTabular(currentTime)}</span>
        <span className="mx-1 text-white/30">/</span>
        <span className="text-white/70">{formatPlaybackTimeTabular(duration)}</span>
      </div>
      <span className="mt-0.5 text-[10px] text-white/40">
        −{formatPlaybackTimeTabular(remaining)}
      </span>
    </div>
  )
}

const PlayerTimeDisplay = memo(PlayerTimeDisplayComponent)
export default PlayerTimeDisplay
