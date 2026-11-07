'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import {
  ControlGroup,
  ControlSectionDivider,
  PLAYER_ICON,
  PLAYER_ICON_PRIMARY,
  PlayerControlButton,
} from '@/components/video-player/controls/player-control-primitives'

interface PlayerNavigationSectionProps {
  playing: boolean
  hasPrevious: boolean
  hasNext: boolean
  onTogglePlay: () => void
  onSeekRelative: (delta: number) => void
  onPreviousLesson?: () => void
  onNextLesson?: () => void
  compact?: boolean
}

function PlayerNavigationSectionComponent({
  playing,
  hasPrevious,
  hasNext,
  onTogglePlay,
  onSeekRelative,
  onPreviousLesson,
  onNextLesson,
  compact = false,
}: PlayerNavigationSectionProps) {
  const t = useTranslations('video_player')

  return (
    <ControlGroup aria-label={t('playback_controls')}>
      {!compact && hasPrevious && onPreviousLesson && (
        <PlayerControlButton
          label={t('previous_lesson')}
          onClick={onPreviousLesson}
          variant="tertiary"
          className="hidden md:inline-flex"
        >
          <ChevronLeft className={PLAYER_ICON} />
        </PlayerControlButton>
      )}

      {!compact && (hasPrevious || hasNext) && (
        <ControlSectionDivider className="hidden md:block" />
      )}

      <PlayerControlButton
        label={t('backward_10')}
        onClick={() => onSeekRelative(-10)}
        variant="secondary"
      >
        <SkipBack className={PLAYER_ICON} />
      </PlayerControlButton>

      <PlayerControlButton
        label={playing ? t('pause') : t('play')}
        onClick={onTogglePlay}
        variant="primary"
      >
        {playing ? (
          <Pause className={PLAYER_ICON_PRIMARY} />
        ) : (
          <Play className={`${PLAYER_ICON_PRIMARY} ms-0.5`} />
        )}
      </PlayerControlButton>

      <PlayerControlButton
        label={t('forward_10')}
        onClick={() => onSeekRelative(10)}
        variant="secondary"
      >
        <SkipForward className={PLAYER_ICON} />
      </PlayerControlButton>

      {!compact && (hasPrevious || hasNext) && (
        <ControlSectionDivider className="hidden md:block" />
      )}

      {!compact && hasNext && onNextLesson && (
        <PlayerControlButton
          label={t('next_lesson')}
          onClick={onNextLesson}
          variant="tertiary"
          className="hidden md:inline-flex"
        >
          <ChevronRight className={PLAYER_ICON} />
        </PlayerControlButton>
      )}
    </ControlGroup>
  )
}

const PlayerNavigationSection = memo(PlayerNavigationSectionComponent)
export default PlayerNavigationSection
