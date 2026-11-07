'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Settings } from 'lucide-react'
import {
  ControlGroup,
  PLAYER_ICON,
  PlayerControlButton,
} from '@/components/video-player/controls/player-control-primitives'

interface PlayerMobileCenterActionsProps {
  onToggleSettings: () => void
  settingsOpen: boolean
}

function PlayerMobileCenterActionsComponent({
  onToggleSettings,
  settingsOpen,
}: PlayerMobileCenterActionsProps) {
  const t = useTranslations('video_player')

  return (
    <ControlGroup className="md:hidden" aria-label={t('playback_preferences')}>
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

const PlayerMobileCenterActions = memo(PlayerMobileCenterActionsComponent)
export default PlayerMobileCenterActions
