'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Settings, Volume2, VolumeX } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPlaybackRate } from '@/lib/playback/preferences'
import {
  ControlGroup,
  PLAYER_ICON,
  PlayerControlButton,
  PlayerControlTooltip,
} from '@/components/video-player/controls/player-control-primitives'
import {
  playerDropdownContent,
  playerDropdownItem,
  playerMenuTrigger,
} from '@/components/video-player/player-ui-styles'
import type { PlaybackQuality } from '@/types/video-player'

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

interface PlayerPreferencesSectionProps {
  volume: number
  muted: boolean
  playbackRate: number
  qualities: PlaybackQuality[]
  selectedQuality: string | 'auto'
  showQuality: boolean
  onVolumeChange: (value: number[]) => void
  onToggleMute: () => void
  onPlaybackRateChange: (rate: number) => void
  onQualityChange: (quality: 'auto' | string) => void
  onToggleSettings: () => void
  settingsOpen: boolean
  showVolume?: boolean
  className?: string
}

function qualityLabel(
  selected: string | 'auto',
  qualities: PlaybackQuality[],
  t: (key: string) => string
): string {
  if (selected === 'auto') return t('quality_auto')
  const match = qualities.find((q) => q.id === selected)
  return match?.label ?? `${selected}p`
}

function PlayerPreferencesSectionComponent({
  volume,
  muted,
  playbackRate,
  qualities,
  selectedQuality,
  showQuality,
  onVolumeChange,
  onToggleMute,
  onPlaybackRateChange,
  onQualityChange,
  onToggleSettings,
  settingsOpen,
  showVolume = true,
  className,
}: PlayerPreferencesSectionProps) {
  const t = useTranslations('video_player')
  const sortedQualities = [...qualities].sort((a, b) => b.height - a.height)

  return (
    <ControlGroup className={className} aria-label={t('playback_preferences')}>
      {showVolume && (
        <>
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
              className="hidden h-1 w-[4.5rem] cursor-pointer accent-white/80 md:block lg:w-20"
              aria-label={t('volume')}
            />
          </PlayerControlTooltip>
        </>
      )}

      {showQuality && sortedQualities.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className={playerMenuTrigger} aria-label={t('video_quality')}>
            {qualityLabel(selectedQuality, sortedQualities, t)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`${playerDropdownContent} min-w-[8.5rem]`}>
            <DropdownMenuItem className={playerDropdownItem} onClick={() => onQualityChange('auto')}>
              {t('quality_auto')}
            </DropdownMenuItem>
            {sortedQualities.map((q) => (
              <DropdownMenuItem key={q.id} className={playerDropdownItem} onClick={() => onQualityChange(q.id)}>
                {q.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger className={playerMenuTrigger} aria-label={t('playback_speed')}>
          {formatPlaybackRate(playbackRate)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={`${playerDropdownContent} min-w-[6.5rem]`}>
          {SPEED_OPTIONS.map((speed) => (
            <DropdownMenuItem
              key={speed}
              className={playerDropdownItem}
              onClick={() => onPlaybackRateChange(speed)}
            >
              {formatPlaybackRate(speed)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <PlayerControlButton
        label={settingsOpen ? t('close_settings') : t('settings')}
        onClick={onToggleSettings}
        variant="tertiary"
        className={settingsOpen ? 'bg-white/12 text-white/90 ring-1 ring-white/15' : undefined}
      >
        <Settings className={PLAYER_ICON} />
      </PlayerControlButton>
    </ControlGroup>
  )
}

const PlayerPreferencesSection = memo(PlayerPreferencesSectionComponent)
export default PlayerPreferencesSection
