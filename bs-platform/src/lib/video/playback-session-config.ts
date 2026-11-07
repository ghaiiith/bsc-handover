import 'server-only'

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readFloatEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Total playback session lifetime in seconds (default: 2 hours). */
export const PLAYBACK_SESSION_TTL_SECONDS = readIntEnv(
  'PLAYBACK_SESSION_TTL_SECONDS',
  60 * 60 * 2
)

/** Renew when this many seconds remain before expiration (default: 15 minutes). */
export const PLAYBACK_SESSION_RENEW_BEFORE_SECONDS = readIntEnv(
  'PLAYBACK_SESSION_RENEW_BEFORE_SECONDS',
  60 * 15
)

/** Alternative renewal trigger as fraction of TTL elapsed (0–1, default: 0.75). */
export const PLAYBACK_SESSION_RENEW_THRESHOLD_RATIO = (() => {
  const parsed = readFloatEnv('PLAYBACK_SESSION_RENEW_THRESHOLD_RATIO', 0.75)
  return parsed > 0 && parsed < 1 ? parsed : 0.75
})()

/** Active playback heartbeat interval in ms (default: 60s). */
export const PLAYBACK_SESSION_HEARTBEAT_MS = readIntEnv(
  'PLAYBACK_SESSION_HEARTBEAT_MS',
  60_000
)

/** Background tab heartbeat interval in ms (default: 10 min). */
export const PLAYBACK_BACKGROUND_HEARTBEAT_MS = readIntEnv(
  'PLAYBACK_BACKGROUND_HEARTBEAT_MS',
  60 * 10 * 1000
)

/** Paused playback heartbeat interval in ms (default: 5 min). */
export const PLAYBACK_PAUSED_HEARTBEAT_MS = readIntEnv(
  'PLAYBACK_PAUSED_HEARTBEAT_MS',
  60 * 5 * 1000
)

export const PLAYBACK_SESSION_MAX_RETRIES = readIntEnv('PLAYBACK_MAX_RETRIES', 5)

export const PLAYBACK_SESSION_RETRY_BASE_MS = readIntEnv(
  'PLAYBACK_RETRY_BASE_MS',
  1_000
)

/** Cross-tab renewal lock duration in ms. */
export const PLAYBACK_SESSION_TAB_LOCK_MS = readIntEnv(
  'PLAYBACK_LEADER_TIMEOUT',
  10_000
)

/** Idle timeout — no lesson activity before session expires (default: 30 min). */
export const PLAYBACK_IDLE_TIMEOUT_MINUTES = readIntEnv(
  'PLAYBACK_IDLE_TIMEOUT_MINUTES',
  30
)

/** Offline grace period in minutes before session is considered lost (default: 10). */
export const PLAYBACK_OFFLINE_GRACE_MINUTES = readIntEnv(
  'PLAYBACK_OFFLINE_GRACE_PERIOD',
  10
)

/** Delay before reducing heartbeat after tab hidden (ms, default: 5s). */
export const PLAYBACK_VISIBILITY_DELAY_MS = readIntEnv(
  'PLAYBACK_VISIBILITY_DELAY',
  5_000
)

export function computeRenewBeforeDate(expiresAt: Date): Date {
  const ttlMs = PLAYBACK_SESSION_TTL_SECONDS * 1000
  const renewByRemainingMs = PLAYBACK_SESSION_RENEW_BEFORE_SECONDS * 1000
  const renewByRatioMs = ttlMs * (1 - PLAYBACK_SESSION_RENEW_THRESHOLD_RATIO)
  const leadTimeMs = Math.min(renewByRemainingMs, renewByRatioMs)
  return new Date(expiresAt.getTime() - leadTimeMs)
}

export function shouldRenewSession(expiresAt: Date, now = Date.now()): boolean {
  return now >= computeRenewBeforeDate(expiresAt).getTime()
}

export function isSessionIdleExpired(lastActivityAt: Date, now = Date.now()): boolean {
  const idleMs = PLAYBACK_IDLE_TIMEOUT_MINUTES * 60 * 1000
  return now - lastActivityAt.getTime() > idleMs
}

/** Client-safe configuration returned by the session API. */
export function getSessionConfigForClient() {
  return {
    ttlSeconds: PLAYBACK_SESSION_TTL_SECONDS,
    renewBeforeSeconds: PLAYBACK_SESSION_RENEW_BEFORE_SECONDS,
    renewThresholdRatio: PLAYBACK_SESSION_RENEW_THRESHOLD_RATIO,
    heartbeatMs: PLAYBACK_SESSION_HEARTBEAT_MS,
    backgroundHeartbeatMs: PLAYBACK_BACKGROUND_HEARTBEAT_MS,
    pausedHeartbeatMs: PLAYBACK_PAUSED_HEARTBEAT_MS,
    maxRetries: PLAYBACK_SESSION_MAX_RETRIES,
    retryBaseMs: PLAYBACK_SESSION_RETRY_BASE_MS,
    idleTimeoutMinutes: PLAYBACK_IDLE_TIMEOUT_MINUTES,
    offlineGraceMinutes: PLAYBACK_OFFLINE_GRACE_MINUTES,
    visibilityDelayMs: PLAYBACK_VISIBILITY_DELAY_MS,
    leaderTimeoutMs: PLAYBACK_SESSION_TAB_LOCK_MS,
  }
}
