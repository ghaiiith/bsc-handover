import { describe, expect, it } from 'vitest'
import { resolvePlayerCapabilities } from '@/lib/playback/player-capabilities'
import {
  mapEngineToUIState,
  PlayerUIStateMachine,
} from '@/lib/playback/player-state-machine'
import { shouldOfferResume } from '@/lib/playback/watch-progress'

describe('resolvePlayerCapabilities', () => {
  it('enables resume and bookmarks for HLS engine', () => {
    const caps = resolvePlayerCapabilities({
      engine: 'hls',
      hasSession: true,
      hasSubtitles: false,
      hasChapters: false,
      hasTimelineEvents: false,
      hasSeekPreview: false,
      hasWatermark: true,
      qualityCount: 3,
    })
    expect(caps.supportsResume).toBe(true)
    expect(caps.supportsBookmarks).toBe(true)
    expect(caps.supportsPlaybackSession).toBe(true)
    expect(caps.supportsQualitySelection).toBe(true)
  })

  it('disables resume for embed engine', () => {
    const caps = resolvePlayerCapabilities({
      engine: 'embed',
      hasSession: false,
      hasSubtitles: false,
      hasChapters: false,
      hasTimelineEvents: false,
      hasSeekPreview: false,
      hasWatermark: false,
      qualityCount: 0,
    })
    expect(caps.supportsResume).toBe(false)
    expect(caps.supportsBookmarks).toBe(false)
  })
})

describe('PlayerUIStateMachine', () => {
  it('allows Ready → Playing', () => {
    const sm = new PlayerUIStateMachine()
    sm.forceTransition('Ready')
    expect(sm.transition('Playing')).toBe(true)
  })
})

describe('mapEngineToUIState', () => {
  it('maps buffering engine state', () => {
    expect(mapEngineToUIState('buffering')).toBe('Buffering')
  })

  it('maps completed when showEnd', () => {
    expect(mapEngineToUIState('paused', { showEnd: true })).toBe('Completed')
  })
})

describe('shouldOfferResume', () => {
  it('offers resume for mid-lesson position', () => {
    expect(
      shouldOfferResume(
        {
          watchPositionSeconds: 120,
          completionPercent: 30,
          lastWatchedAt: new Date().toISOString(),
          completed: false,
        },
        600
      )
    ).toBe(true)
  })

  it('skips resume when nearly complete', () => {
    expect(
      shouldOfferResume(
        {
          watchPositionSeconds: 580,
          completionPercent: 97,
          lastWatchedAt: new Date().toISOString(),
          completed: false,
        },
        600
      )
    ).toBe(false)
  })
})
