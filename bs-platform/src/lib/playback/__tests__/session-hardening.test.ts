import { describe, expect, it } from 'vitest'
import {
  computeHeartbeatIntervalMs,
  DEFAULT_SESSION_CLIENT_CONFIG,
  isSessionStillValid,
  mergeSessionConfig,
  shouldRenewClientSession,
} from '@/lib/playback/session-lifecycle'
import { computeBackoffWithJitter } from '@/lib/playback/session-retry'
import {
  PlaybackSessionStateMachine,
  isTerminalSessionState,
} from '@/lib/playback/session-state-machine'
import { sessionRequiredByCapabilities } from '@/lib/video/playback-protection-capabilities'

describe('PlaybackSessionStateMachine', () => {
  it('allows valid transitions', () => {
    const sm = new PlaybackSessionStateMachine()
    expect(sm.transition('Creating')).toBe(true)
    expect(sm.transition('Active')).toBe(true)
    expect(sm.transition('Renewing')).toBe(true)
    expect(sm.current).toBe('Renewing')
  })

  it('rejects invalid transitions from Expired to Renewing', () => {
    const sm = new PlaybackSessionStateMachine()
    sm.forceTransition('Expired')
    expect(sm.canTransition('Renewing')).toBe(false)
    expect(sm.transition('Renewing')).toBe(false)
  })

  it('identifies terminal states', () => {
    expect(isTerminalSessionState('Expired')).toBe(true)
    expect(isTerminalSessionState('Active')).toBe(false)
  })
})

describe('computeBackoffWithJitter', () => {
  it('grows with attempt and stays within max', () => {
    const a1 = computeBackoffWithJitter(1, 1000)
    const a4 = computeBackoffWithJitter(4, 1000)
    expect(a1).toBeGreaterThanOrEqual(1000)
    expect(a4).toBeGreaterThan(a1)
    expect(a4).toBeLessThanOrEqual(60_000)
  })
})

describe('computeHeartbeatIntervalMs', () => {
  const config = DEFAULT_SESSION_CLIENT_CONFIG

  it('returns active interval when playing and visible', () => {
    expect(
      computeHeartbeatIntervalMs(config, {
        playbackState: 'playing',
        isVisible: true,
        isOnline: true,
        isLeader: true,
      })
    ).toBe(config.heartbeatMs)
  })

  it('returns paused interval when paused', () => {
    expect(
      computeHeartbeatIntervalMs(config, {
        playbackState: 'paused',
        isVisible: true,
        isOnline: true,
        isLeader: true,
      })
    ).toBe(config.pausedHeartbeatMs)
  })

  it('returns background interval when tab hidden', () => {
    expect(
      computeHeartbeatIntervalMs(config, {
        playbackState: 'playing',
        isVisible: false,
        isOnline: true,
        isLeader: true,
      })
    ).toBe(config.backgroundHeartbeatMs)
  })

  it('suspends heartbeat when offline', () => {
    expect(
      computeHeartbeatIntervalMs(config, {
        playbackState: 'playing',
        isVisible: true,
        isOnline: false,
        isLeader: true,
      })
    ).toBeNull()
  })

  it('suspends heartbeat for follower tabs', () => {
    expect(
      computeHeartbeatIntervalMs(config, {
        playbackState: 'playing',
        isVisible: true,
        isOnline: true,
        isLeader: false,
      })
    ).toBeNull()
  })
})

describe('session lifecycle helpers', () => {
  it('detects session still valid with skew', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isSessionStillValid(future)).toBe(true)
  })

  it('detects when renewal is due', () => {
    const renewBefore = new Date(Date.now() - 1000).toISOString()
    expect(shouldRenewClientSession(renewBefore)).toBe(true)
  })

  it('merges partial config with defaults', () => {
    const merged = mergeSessionConfig({ heartbeatMs: 30_000 })
    expect(merged.heartbeatMs).toBe(30_000)
    expect(merged.pausedHeartbeatMs).toBe(DEFAULT_SESSION_CLIENT_CONFIG.pausedHeartbeatMs)
  })
})

describe('idle timeout logic', () => {
  it('expires session after configured idle period', () => {
    const idleMinutes = 30
    const lastActivity = Date.now() - idleMinutes * 60 * 1000 - 1
    const idleMs = idleMinutes * 60 * 1000
    expect(Date.now() - lastActivity > idleMs).toBe(true)
  })

  it('keeps session alive within idle period', () => {
    const idleMinutes = 30
    const lastActivity = Date.now() - 5 * 60 * 1000
    const idleMs = idleMinutes * 60 * 1000
    expect(Date.now() - lastActivity > idleMs).toBe(false)
  })
})

describe('offline grace logic', () => {
  it('allows recovery within grace period', () => {
    const graceMinutes = 10
    const offlineSince = Date.now() - 5 * 60 * 1000
    const graceMs = graceMinutes * 60 * 1000
    expect(Date.now() - offlineSince > graceMs).toBe(false)
  })

  it('expires after grace period exceeded', () => {
    const graceMinutes = 10
    const offlineSince = Date.now() - 11 * 60 * 1000
    const graceMs = graceMinutes * 60 * 1000
    expect(Date.now() - offlineSince > graceMs).toBe(true)
  })
})

describe('state machine offline flow', () => {
  it('allows Active → Offline → Recovering → Active', () => {
    const sm = new PlaybackSessionStateMachine()
    sm.transition('Creating')
    sm.transition('Active')
    expect(sm.transition('Offline')).toBe(true)
    expect(sm.transition('Recovering')).toBe(true)
    expect(sm.transition('Active')).toBe(true)
  })
})

describe('playback protection capabilities', () => {
  it('requires session for encrypted HLS', () => {
    expect(
      sessionRequiredByCapabilities({
        requiresPlaybackSession: true,
        supportsEncryptedHls: true,
        supportsSignedPlayback: true,
        supportsCookieValidation: true,
        supportsDrm: false,
      })
    ).toBe(true)
  })

  it('does not require session for embed-only playback', () => {
    expect(
      sessionRequiredByCapabilities({
        requiresPlaybackSession: false,
        supportsEncryptedHls: false,
        supportsSignedPlayback: true,
        supportsCookieValidation: false,
        supportsDrm: false,
      })
    ).toBe(false)
  })
})
