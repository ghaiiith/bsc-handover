import type { PlayerPreferences } from '@/types/video-player'

const STORAGE_KEY = 'bs-platform-player-preferences'

const DEFAULT_PREFERENCES: PlayerPreferences = {
  playbackRate: 1,
  quality: 'auto',
  subtitleId: null,
  subtitleSize: 'md',
  subtitleColor: '#ffffff',
  subtitleBackground: true,
  autoQuality: true,
  volume: 1,
  muted: false,
  rememberPreferences: true,
  focusMode: false,
  cinemaMode: false,
  autoplayNext: true,
  pipEnabled: false,
}

/** SSR-safe default — must match the server render before hydration. */
export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = DEFAULT_PREFERENCES

export function loadPlayerPreferences(): PlayerPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) as Partial<PlayerPreferences> }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePlayerPreferences(prefs: Partial<PlayerPreferences>): PlayerPreferences {
  const current = loadPlayerPreferences()
  const remember = prefs.rememberPreferences ?? current.rememberPreferences
  const merged = { ...current, ...prefs }

  if (typeof window !== 'undefined' && remember) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } else if (typeof window !== 'undefined' && remember === false) {
    localStorage.removeItem(STORAGE_KEY)
  }

  return merged
}

export function applyPlayerPreferences(prefs: Partial<PlayerPreferences>): PlayerPreferences {
  const current = loadPlayerPreferences()
  if (!current.rememberPreferences) {
    return { ...current, ...prefs }
  }
  return savePlayerPreferences(prefs)
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Tabular MM:SS or HH:MM:SS — fixed width for control bar time display. */
export function formatPlaybackTimeTabular(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatPlaybackRate(rate: number): string {
  return `${rate.toFixed(1)}×`
}
