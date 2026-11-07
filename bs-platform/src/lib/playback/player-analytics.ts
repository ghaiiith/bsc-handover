import type { PlaybackAnalyticsEvent, PlaybackAnalyticsPayload } from '@/types/video-player'
import { trackPlaybackEvent } from '@/lib/playback/analytics'

export interface PlayerAnalyticsState {
  seekCount: number
  pauseCount: number
  totalWatchMs: number
  lastPlayAt: number | null
  bufferCount: number
  qualityChanges: number
  speedChanges: number
}

export function createAnalyticsState(): PlayerAnalyticsState {
  return {
    seekCount: 0,
    pauseCount: 0,
    totalWatchMs: 0,
    lastPlayAt: null,
    bufferCount: 0,
    qualityChanges: 0,
    speedChanges: 0,
  }
}

export function recordPlay(state: PlayerAnalyticsState): void {
  state.lastPlayAt = Date.now()
}

export function recordPause(state: PlayerAnalyticsState): void {
  if (state.lastPlayAt) {
    state.totalWatchMs += Date.now() - state.lastPlayAt
    state.lastPlayAt = null
  }
  state.pauseCount += 1
}

export function recordSeek(state: PlayerAnalyticsState): void {
  state.seekCount += 1
}

export function trackPlayerEvent(
  endpoint: string | undefined,
  event: PlaybackAnalyticsEvent,
  payload: Omit<PlaybackAnalyticsPayload, 'event'>,
  state?: PlayerAnalyticsState
): void {
  trackPlaybackEvent(endpoint, {
    event,
    ...payload,
    metadata: {
      ...payload.metadata,
      ...(state
        ? {
            seekCount: state.seekCount,
            pauseCount: state.pauseCount,
            totalWatchMs: state.totalWatchMs,
            bufferCount: state.bufferCount,
          }
        : {}),
    },
  })

  if (!state) return
  if (event === 'playback_seeked') recordSeek(state)
  if (event === 'playback_paused') recordPause(state)
  if (event === 'playback_resumed' || event === 'playback_started') recordPlay(state)
  if (event === 'buffer_start') state.bufferCount += 1
  if (event === 'quality_changed') state.qualityChanges += 1
  if (event === 'speed_changed') state.speedChanges += 1
}
