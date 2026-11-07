'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Settings } from 'lucide-react'
import PlayerLearningToolsSection from '@/components/video-player/controls/PlayerLearningToolsSection'
import PlayerVolumeSection from '@/components/video-player/controls/PlayerVolumeSection'
import PlayerDisplaySection from '@/components/video-player/controls/PlayerDisplaySection'
import {
  ControlGroup,
  ControlSectionDivider,
  PLAYER_ICON,
  PlayerControlButton,
} from '@/components/video-player/controls/player-control-primitives'
import { getVisibleLearningTools } from '@/lib/playback/learning-tools'
import type { PlayerBookmark } from '@/types/video-player'

interface PlayerUtilitySectionProps {
  showBookmarks: boolean
  bookmarks: PlayerBookmark[]
  onAddBookmark?: () => void
  onSeekToBookmark?: (timestampSeconds: number) => void
  onToggleSettings: () => void
  settingsOpen: boolean
  volume: number
  muted: boolean
  isFullscreen: boolean
  supportsPiP: boolean
  onVolumeChange: (value: number[]) => void
  onToggleMute: () => void
  onPictureInPicture: () => void
  onToggleFullscreen: () => void
}

function PlayerUtilitySectionComponent({
  showBookmarks,
  bookmarks,
  onAddBookmark,
  onSeekToBookmark,
  onToggleSettings,
  settingsOpen,
  volume,
  muted,
  isFullscreen,
  supportsPiP,
  onVolumeChange,
  onToggleMute,
  onPictureInPicture,
  onToggleFullscreen,
}: PlayerUtilitySectionProps) {
  const t = useTranslations('video_player')
  const showBookmarkTool =
    showBookmarks &&
    onAddBookmark != null &&
    getVisibleLearningTools({ bookmark: showBookmarks }).length > 0

  return (
    <ControlGroup aria-label={t('display_controls')}>
      {showBookmarkTool && (
        <PlayerLearningToolsSection
          showBookmarks={showBookmarks}
          bookmarks={bookmarks}
          onAddBookmark={onAddBookmark}
          onSeekToBookmark={onSeekToBookmark}
        />
      )}

      <PlayerControlButton
        label={settingsOpen ? t('close_settings') : t('settings')}
        onClick={onToggleSettings}
        variant="tertiary"
        className={settingsOpen ? 'bg-white/12 text-white/90 ring-1 ring-white/15' : undefined}
      >
        <Settings className={PLAYER_ICON} />
      </PlayerControlButton>

      {isFullscreen && (
        <>
          <ControlSectionDivider className="!mx-0 h-5" />
          <PlayerVolumeSection
            volume={volume}
            muted={muted}
            showVolume
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />
        </>
      )}

      <ControlSectionDivider className="!mx-0 h-5" />

      <PlayerDisplaySection
        isFullscreen={isFullscreen}
        supportsPiP={supportsPiP}
        onPictureInPicture={onPictureInPicture}
        onToggleFullscreen={onToggleFullscreen}
      />
    </ControlGroup>
  )
}

const PlayerUtilitySection = memo(PlayerUtilitySectionComponent)
export default PlayerUtilitySection
