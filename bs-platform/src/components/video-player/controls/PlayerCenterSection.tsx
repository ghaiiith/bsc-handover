'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import PlayerTimeDisplay from '@/components/video-player/controls/PlayerTimeDisplay'

interface PlayerCenterSectionProps {
  currentTime: number
  duration: number
}

function PlayerCenterSectionComponent({
  currentTime,
  duration,
}: PlayerCenterSectionProps) {
  const t = useTranslations('video_player')

  return (
    <div aria-label={t('time_display')}>
      <PlayerTimeDisplay currentTime={currentTime} duration={duration} />
    </div>
  )
}

const PlayerCenterSection = memo(PlayerCenterSectionComponent)
export default PlayerCenterSection
