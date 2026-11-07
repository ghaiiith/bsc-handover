import type { PlaybackSessionInfo } from '@/types/content-protection'

export type PlaybackSessionLifecycleEvent =
  | 'SessionCreated'
  | 'SessionRenewed'
  | 'RenewalFailed'
  | 'SessionExpired'
  | 'PlaybackResumed'
  | 'PlaybackStopped'

export type PlaybackActivityState = 'playing' | 'paused' | 'buffering' | 'idle'

export interface PlaybackSessionState {
  sessionId: string
  expiresAt: string
  renewBefore: string
}

export interface PlaybackSessionClientConfig {
  ttlSeconds: number
  renewBeforeSeconds: number
  renewThresholdRatio: number
  heartbeatMs: number
  backgroundHeartbeatMs: number
  pausedHeartbeatMs: number
  maxRetries: number
  retryBaseMs: number
  idleTimeoutMinutes: number
  offlineGraceMinutes: number
  visibilityDelayMs: number
  leaderTimeoutMs: number
}

/** Client defaults — overridden by session API config when available. */
export const DEFAULT_SESSION_CLIENT_CONFIG: PlaybackSessionClientConfig = {
  ttlSeconds: 60 * 60 * 2,
  renewBeforeSeconds: 60 * 15,
  renewThresholdRatio: 0.75,
  heartbeatMs: 60_000,
  backgroundHeartbeatMs: 60 * 10 * 1000,
  pausedHeartbeatMs: 60 * 5 * 1000,
  maxRetries: 5,
  retryBaseMs: 1_000,
  idleTimeoutMinutes: 30,
  offlineGraceMinutes: 10,
  visibilityDelayMs: 5_000,
  leaderTimeoutMs: 10_000,
}

export interface PlaybackSessionApiResponse {
  valid: boolean
  renewed?: boolean
  created?: boolean
  touched?: boolean
  expiresAt?: string
  renewBefore?: string
  sessionId?: string
  error?: string
  config?: Partial<PlaybackSessionClientConfig>
}

export function toSessionState(info: PlaybackSessionInfo): PlaybackSessionState {
  return {
    sessionId: info.sessionId,
    expiresAt: info.expiresAt,
    renewBefore: info.renewBefore,
  }
}

export function isSessionStillValid(expiresAt: string, skewMs = 5_000): boolean {
  return new Date(expiresAt).getTime() - skewMs > Date.now()
}

export function shouldRenewClientSession(renewBefore: string): boolean {
  return Date.now() >= new Date(renewBefore).getTime()
}

export function computeBackoffMs(attempt: number, baseMs: number): number {
  const capped = Math.min(attempt, 8)
  return baseMs * 2 ** capped
}

export interface HeartbeatContext {
  playbackState: PlaybackActivityState
  isVisible: boolean
  isOnline: boolean
  isLeader: boolean
}

/** Adaptive heartbeat interval — null means heartbeat suspended. */
export function computeHeartbeatIntervalMs(
  config: PlaybackSessionClientConfig,
  context: HeartbeatContext
): number | null {
  if (!context.isOnline || !context.isLeader) return null
  if (!context.isVisible) return config.backgroundHeartbeatMs
  if (context.playbackState === 'playing') return config.heartbeatMs
  if (context.playbackState === 'buffering') return config.heartbeatMs * 2
  return config.pausedHeartbeatMs
}

export function mergeSessionConfig(
  partial?: Partial<PlaybackSessionClientConfig>
): PlaybackSessionClientConfig {
  return { ...DEFAULT_SESSION_CLIENT_CONFIG, ...partial }
}

const TAB_LOCK_PREFIX = 'bs-playback-renew-lock:'

export function tryAcquireSessionRenewLock(
  lessonId: string,
  lockTtlMs: number
): boolean {
  if (typeof window === 'undefined') return true
  const key = `${TAB_LOCK_PREFIX}${lessonId}`
  const now = Date.now()
  try {
    const existing = localStorage.getItem(key)
    if (existing && now - Number(existing) < lockTtlMs) {
      return false
    }
    localStorage.setItem(key, String(now))
    return true
  } catch {
    return true
  }
}

export function releaseSessionRenewLock(lessonId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${TAB_LOCK_PREFIX}${lessonId}`)
  } catch {
    /* ignore */
  }
}
