'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Maximize, Minimize, Settings, Volume2, VolumeX } from 'lucide-react'
import PlayerTimeline from '@/components/video-player/PlayerTimeline'
import PlayerNavigationSection from '@/components/video-player/controls/PlayerNavigationSection'
import PlayerCenterSection from '@/components/video-player/controls/PlayerCenterSection'
import PlayerUtilitySection from '@/components/video-player/controls/PlayerUtilitySection'
import PlayerMoreMenu from '@/components/video-player/controls/PlayerMoreMenu'
import {
  PLAYER_ICON,
  PlayerControlButton,
} from '@/components/video-player/controls/player-control-primitives'
import { PLAYER_SECTION_GAP, playerControlBar } from '@/components/video-player/player-ui-styles'
import type {
  PlayerBookmark,
  PlayerChapter,
  PlayerTimelineEvent,
  SeekPreviewSprites,
} from '@/types/video-player'

interface PlayerControlsProps {
  visible: boolean
  playing: boolean
  currentTime: number
  duration: number
  bufferedPercent: number
  volume: number
  muted: boolean
  showBookmarks: boolean
  supportsPiP: boolean
  isFullscreen: boolean
  hasPrevious: boolean
  hasNext: boolean
  chapters?: PlayerChapter[]
  bookmarks?: PlayerBookmark[]
  timelineEvents?: PlayerTimelineEvent[]
  seekPreview?: SeekPreviewSprites
  onTogglePlay: () => void
  onSeek: (percent: number) => void
  onSeekRelative: (delta: number) => void
  onVolumeChange: (value: number[]) => void
  onToggleMute: () => void
  onToggleSettings: () => void
  settingsOpen: boolean
  onToggleFullscreen: () => void
  onPictureInPicture: () => void
  onAddBookmark?: () => void
  onSeekToBookmark?: (timestampSeconds: number) => void
  onPreviousLesson?: () => void
  onNextLesson?: () => void
  onStopPropagation: (event: React.MouseEvent) => void
}

function PlayerControlsComponent({
  visible,
  playing,
  currentTime,
  duration,
  bufferedPercent,
  volume,
  muted,
  showBookmarks,
  supportsPiP,
  isFullscreen,
  hasPrevious,
  hasNext,
  chapters,
  bookmarks,
  timelineEvents,
  seekPreview,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onVolumeChange,
  onToggleMute,
  onToggleSettings,
  settingsOpen,
  onToggleFullscreen,
  onPictureInPicture,
  onAddBookmark,
  onSeekToBookmark,
  onPreviousLesson,
  onNextLesson,
  onStopPropagation,
}: PlayerControlsProps) {
  const t = useTranslations('video_player')

  return (
    <div
      className={`${playerControlBar} ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      data-player-controls
      onClick={onStopPropagation}
      onDoubleClick={onStopPropagation}
    >
      <PlayerTimeline
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={bufferedPercent}
        chapters={chapters}
        bookmarks={bookmarks}
        timelineEvents={timelineEvents}
        seekPreview={seekPreview}
        onSeek={onSeek}
      />

      <div className="relative mt-1 flex items-center justify-between">
        {/* Left — playback */}
        <div className="flex min-w-0 flex-1 items-center justify-start">
          <PlayerNavigationSection
            playing={playing}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onTogglePlay={onTogglePlay}
            onSeekRelative={onSeekRelative}
            onPreviousLesson={onPreviousLesson}
            onNextLesson={onNextLesson}
            compact={false}
          />
        </div>

        {/* Center — time only */}
        <div className="pointer-events-none absolute inset-x-0 hidden items-center justify-center md:flex">
          <PlayerCenterSection currentTime={currentTime} duration={duration} />
        </div>

        {/* Right — bookmark, settings, volume (fullscreen), PiP, fullscreen */}
        <div className={`flex flex-1 items-center justify-end ${PLAYER_SECTION_GAP}`}>
          <div className="hidden md:block">
            <PlayerUtilitySection
              showBookmarks={showBookmarks}
              bookmarks={bookmarks ?? []}
              onAddBookmark={onAddBookmark}
              onSeekToBookmark={onSeekToBookmark}
              onToggleSettings={onToggleSettings}
              settingsOpen={settingsOpen}
              volume={volume}
              muted={muted}
              isFullscreen={isFullscreen}
              supportsPiP={supportsPiP}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
              onPictureInPicture={onPictureInPicture}
              onToggleFullscreen={onToggleFullscreen}
            />
          </div>

          <div className="flex items-center gap-2.5 md:hidden">
            <PlayerControlButton
              label={settingsOpen ? t('close_settings') : t('settings')}
              onClick={onToggleSettings}
              variant="tertiary"
              className={settingsOpen ? 'bg-white/12 text-white/90 ring-1 ring-white/15' : undefined}
            >
              <Settings className={PLAYER_ICON} />
            </PlayerControlButton>

            {isFullscreen && (
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

            <PlayerMoreMenu
              showBookmarks={showBookmarks}
              bookmarks={bookmarks}
              supportsPiP={supportsPiP}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              onToggleSettings={onToggleSettings}
              onAddBookmark={onAddBookmark}
              onSeekToBookmark={onSeekToBookmark}
              onPictureInPicture={onPictureInPicture}
              onPreviousLesson={onPreviousLesson}
              onNextLesson={onNextLesson}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const PlayerControls = memo(PlayerControlsComponent)
export default PlayerControls
