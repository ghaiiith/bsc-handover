'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Volume2, VolumeX } from 'lucide-react'
import {
  ControlGroup,
  PLAYER_ICON,
  PlayerControlButton,
  PlayerControlTooltip,
} from '@/components/video-player/controls/player-control-primitives'

interface PlayerVolumeSectionProps {
  volume: number
  muted: boolean
  showVolume?: boolean
  onVolumeChange: (value: number[]) => void
  onToggleMute: () => void
  className?: string
}

function PlayerVolumeSectionComponent({
  volume,
  muted,
  showVolume = false,
  onVolumeChange,
  onToggleMute,
  className,
}: PlayerVolumeSectionProps) {
  const t = useTranslations('video_player')

  if (!showVolume) return null

  return (
    <ControlGroup className={className} aria-label={t('playback_preferences')}>
      <PlayerControlButton
        label={muted ? t('unmute') : t('mute')}
        onClick={onToggleMute}
        variant="secondary"
      >
        {muted || volume === 0 ? (
          <VolumeX className={PLAYER_ICON} />
        ) : (
          <Volume2 className={PLAYER_ICON} />
        )}
      </PlayerControlButton>

      <PlayerControlTooltip label={t('volume')}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={muted ? 0 : volume * 100}
          onChange={(e) => onVolumeChange([Number(e.target.value) / 100])}
          className="hidden h-1 w-16 cursor-pointer accent-white/80 md:block lg:w-20"
          aria-label={t('volume')}
        />
      </PlayerControlTooltip>
    </ControlGroup>
  )
}

const PlayerVolumeSection = memo(PlayerVolumeSectionComponent)
export default PlayerVolumeSection
