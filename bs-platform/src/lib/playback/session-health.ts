import type { PlaybackSessionState } from '@/lib/playback/session-lifecycle'

export type SessionObservabilityEvent =
  | 'SessionCreated'
  | 'SessionRenewed'
  | 'RenewalStarted'
  | 'RenewalCompleted'
  | 'RenewalFailed'
  | 'RetryScheduled'
  | 'RetrySucceeded'
  | 'RetryFailed'
  | 'OfflineStarted'
  | 'OfflineRecovered'
  | 'VisibilityHidden'
  | 'VisibilityVisible'
  | 'LeaderChanged'
  | 'SessionExpired'
  | 'PlaybackStopped'
  | 'ActivityRecorded'

export interface SessionObservabilityPayload {
  event: SessionObservabilityEvent
  lessonId?: string
  courseId?: string
  sessionId?: string
  machineState?: string
  retryAttempt?: number
  latencyMs?: number
  isLeader?: boolean
  metadata?: Record<string, string | number | boolean>
}

/** Structured client-side session logs — never includes tokens or cookies. */
export function logSessionEvent(payload: SessionObservabilityPayload): void {
  if (process.env.NODE_ENV === 'production') {
    return
  }
  console.info('[playback-session]', {
    ...payload,
    ts: new Date().toISOString(),
  })
}

export interface SessionMetricsSnapshot {
  renewalCount: number
  retryCount: number
  offlineRecoveries: number
  renewalFailures: number
  averageRenewalLatencyMs: number
  longestSessionMs: number
  leaderChanges: number
}

export class SessionMetricsCollector {
  private renewalCount = 0
  private retryCount = 0
  private offlineRecoveries = 0
  private renewalFailures = 0
  private renewalLatencies: number[] = []
  private sessionStartedAt: number | null = null
  private leaderChanges = 0

  recordSessionStart(): void {
    this.sessionStartedAt = Date.now()
  }

  recordRenewal(latencyMs: number): void {
    this.renewalCount += 1
    this.renewalLatencies.push(latencyMs)
  }

  recordRetry(): void {
    this.retryCount += 1
  }

  recordRenewalFailure(): void {
    this.renewalFailures += 1
  }

  recordOfflineRecovery(): void {
    this.offlineRecoveries += 1
  }

  recordLeaderChange(): void {
    this.leaderChanges += 1
  }

  snapshot(): SessionMetricsSnapshot {
    const avg =
      this.renewalLatencies.length > 0
        ? this.renewalLatencies.reduce((a, b) => a + b, 0) /
          this.renewalLatencies.length
        : 0
    const longest = this.sessionStartedAt
      ? Date.now() - this.sessionStartedAt
      : 0

    return {
      renewalCount: this.renewalCount,
      retryCount: this.retryCount,
      offlineRecoveries: this.offlineRecoveries,
      renewalFailures: this.renewalFailures,
      averageRenewalLatencyMs: Math.round(avg),
      longestSessionMs: longest,
      leaderChanges: this.leaderChanges,
    }
  }
}

export interface SessionHealthSnapshot {
  remainingLifetimeMs: number
  sessionAgeMs: number
  renewalLatencyMs: number | null
  retryCount: number
  offlineDurationMs: number
  heartbeatLatencyMs: number | null
  cookieExpiresAt: string | null
  dbExpiresAt: string | null
  validationSuccessRate: number
  machineState: string
  isLeader: boolean
  isOnline: boolean
  isVisible: boolean
}

export class SessionHealthMonitor {
  private sessionCreatedAt: number | null = null
  private renewalLatencyMs: number | null = null
  private heartbeatLatencyMs: number | null = null
  private retryCount = 0
  private offlineSince: number | null = null
  private validations = 0
  private validationSuccesses = 0

  onSessionStart(): void {
    this.sessionCreatedAt = Date.now()
  }

  onRenewalComplete(latencyMs: number): void {
    this.renewalLatencyMs = latencyMs
    this.validations += 1
    this.validationSuccesses += 1
  }

  onHeartbeatComplete(latencyMs: number): void {
    this.heartbeatLatencyMs = latencyMs
  }

  onRetry(): void {
    this.retryCount += 1
  }

  onValidationFailure(): void {
    this.validations += 1
  }

  onOffline(): void {
    this.offlineSince = Date.now()
  }

  onOnline(): void {
    this.offlineSince = null
  }

  snapshot(
    session: PlaybackSessionState | null,
    machineState: string,
    isLeader: boolean,
    isOnline: boolean,
    isVisible: boolean
  ): SessionHealthSnapshot {
    const now = Date.now()
    const dbExpires = session?.expiresAt ? new Date(session.expiresAt).getTime() : 0

    return {
      remainingLifetimeMs: dbExpires > 0 ? Math.max(0, dbExpires - now) : 0,
      sessionAgeMs: this.sessionCreatedAt ? now - this.sessionCreatedAt : 0,
      renewalLatencyMs: this.renewalLatencyMs,
      retryCount: this.retryCount,
      offlineDurationMs: this.offlineSince ? now - this.offlineSince : 0,
      heartbeatLatencyMs: this.heartbeatLatencyMs,
      cookieExpiresAt: session?.expiresAt ?? null,
      dbExpiresAt: session?.expiresAt ?? null,
      validationSuccessRate:
        this.validations > 0 ? this.validationSuccesses / this.validations : 1,
      machineState,
      isLeader,
      isOnline,
      isVisible,
    }
  }
}
