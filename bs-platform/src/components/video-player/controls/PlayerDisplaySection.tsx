'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Maximize, Minimize, PictureInPicture2 } from 'lucide-react'
import {
  ControlGroup,
  PLAYER_ICON,
  PlayerControlButton,
} from '@/components/video-player/controls/player-control-primitives'

interface PlayerDisplaySectionProps {
  isFullscreen: boolean
  supportsPiP: boolean
  onPictureInPicture: () => void
  onToggleFullscreen: () => void
  className?: string
}

function PlayerDisplaySectionComponent({
  isFullscreen,
  supportsPiP,
  onPictureInPicture,
  onToggleFullscreen,
  className,
}: PlayerDisplaySectionProps) {
  const t = useTranslations('video_player')

  return (
    <ControlGroup className={className} aria-label={t('display_controls')}>
      {supportsPiP && (
        <PlayerControlButton
          label={t('picture_in_picture')}
          onClick={onPictureInPicture}
          variant="tertiary"
        >
          <PictureInPicture2 className={PLAYER_ICON} />
        </PlayerControlButton>
      )}

      <PlayerControlButton
        label={isFullscreen ? t('exit_fullscreen') : t('fullscreen')}
        onClick={onToggleFullscreen}
        variant="secondary"
      >
        {isFullscreen ? (
          <Minimize className={PLAYER_ICON} />
        ) : (
          <Maximize className={PLAYER_ICON} />
        )}
      </PlayerControlButton>
    </ControlGroup>
  )
}

const PlayerDisplaySection = memo(PlayerDisplaySectionComponent)
export default PlayerDisplaySection
