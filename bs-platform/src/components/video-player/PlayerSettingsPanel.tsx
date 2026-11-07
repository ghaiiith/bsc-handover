'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatPlaybackRate } from '@/lib/playback/preferences'
import { cn } from '@/lib/utils'
import {
  playerOverlayPanel,
  playerSettingsPanel,
  playerSettingsPanelFullscreen,
  playerSettingsPanelNormal,
  playerSettingsRow,
  playerSettingsSelectTrigger,
} from '@/components/video-player/player-ui-styles'
import type { PlaybackQuality, PlayerPreferences } from '@/types/video-player'

interface PlayerSettingsPanelProps {
  open: boolean
  onClose: () => void
  isFullscreen?: boolean
  preferences: PlayerPreferences
  qualities: PlaybackQuality[]
  hasNext?: boolean
  onPreferencesChange: (prefs: Partial<PlayerPreferences>) => void
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const PANEL_ANIMATION_MS = 220

function SettingsSelectField({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string
  value: string
  onValueChange: (value: string | null) => void
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1">
      <span className="text-[11px] text-white/55">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={playerSettingsSelectTrigger}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

function SettingsSwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className={cn(playerSettingsRow, 'py-2')}>
      <span className="text-[11px] text-white/85">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

export default function PlayerSettingsPanel({
  open,
  onClose,
  isFullscreen = false,
  preferences,
  qualities,
  hasNext = false,
  onPreferencesChange,
}: PlayerSettingsPanelProps) {
  const t = useTranslations('video_player')
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), PANEL_ANIMATION_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!mounted) return null

  const sortedQualities = [...qualities].sort((a, b) => b.height - a.height)

  return (
    <div
      ref={panelRef}
      className={cn(
        playerOverlayPanel,
        playerSettingsPanel,
        isFullscreen ? playerSettingsPanelFullscreen : playerSettingsPanelNormal,
        'transition-all duration-200 ease-out motion-reduce:transition-none',
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none translate-y-2 scale-[0.98] opacity-0'
      )}
      data-player-controls
      role="dialog"
      aria-modal="true"
      aria-label={t('settings_title')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-white">{t('settings_title')}</h3>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label={t('close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-0 space-y-2.5">
        <SettingsSelectField
          label={t('playback_speed')}
          value={String(preferences.playbackRate)}
          onValueChange={(v) => {
            if (v != null) onPreferencesChange({ playbackRate: Number(v) })
          }}
        >
          {SPEED_OPTIONS.map((speed) => (
            <SelectItem key={speed} value={String(speed)}>
              {formatPlaybackRate(speed)}
            </SelectItem>
          ))}
        </SettingsSelectField>

        {sortedQualities.length > 0 && (
          <SettingsSelectField
            label={t('video_quality')}
            value={String(preferences.quality)}
            onValueChange={(v) => {
              if (v == null) return
              onPreferencesChange({
                quality: v === 'auto' ? 'auto' : Number(v),
                autoQuality: v === 'auto',
              })
            }}
          >
            <SelectItem value="auto">{t('quality_auto')}</SelectItem>
            {sortedQualities.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.label}
              </SelectItem>
            ))}
          </SettingsSelectField>
        )}

        {hasNext && (
          <SettingsSwitchRow
            label={t('autoplay_next')}
            checked={preferences.autoplayNext}
            onCheckedChange={(checked) =>
              onPreferencesChange({ autoplayNext: checked })
            }
          />
        )}

        <SettingsSwitchRow
          label={t('remember_preferences')}
          checked={preferences.rememberPreferences}
          onCheckedChange={(checked) =>
            onPreferencesChange({ rememberPreferences: checked })
          }
        />
      </div>
    </div>
  )
}
