import type { PlaybackSubtitleTrack } from '@/types/video-player'
import { SUBTITLE_UI_ENABLED } from '@/types/video-player'

export interface SubtitleRenderOptions {
  size: 'sm' | 'md' | 'lg'
  color: string
  background: boolean
  direction: 'rtl' | 'ltr'
}

/** Internal subtitle manager — UI gated by SUBTITLE_UI_ENABLED. */
export class SubtitleManager {
  private tracks: PlaybackSubtitleTrack[] = []
  private activeId: string | null = null

  loadTracks(tracks: PlaybackSubtitleTrack[]): void {
    this.tracks = tracks
    const defaultTrack = tracks.find((t) => t.default)
    if (defaultTrack) this.activeId = defaultTrack.id
  }

  getTracks(): PlaybackSubtitleTrack[] {
    return this.tracks
  }

  getActiveTrack(): PlaybackSubtitleTrack | null {
    if (!this.activeId) return null
    return this.tracks.find((t) => t.id === this.activeId) ?? null
  }

  setActiveTrack(id: string | null): void {
    this.activeId = id
  }

  isUiEnabled(): boolean {
    return SUBTITLE_UI_ENABLED && this.tracks.length > 0
  }

  getRenderOptions(locale: string): SubtitleRenderOptions {
    return {
      size: 'md',
      color: '#ffffff',
      background: true,
      direction: locale === 'ar' ? 'rtl' : 'ltr',
    }
  }
}

export function createSubtitleManager(): SubtitleManager {
  return new SubtitleManager()
}
