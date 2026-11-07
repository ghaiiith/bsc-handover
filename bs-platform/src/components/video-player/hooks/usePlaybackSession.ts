'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackPlaybackEvent } from '@/lib/playback/analytics'
import { SessionCoordinator } from '@/lib/playback/session-coordinator'
import {
  SessionHealthMonitor,
  SessionMetricsCollector,
  logSessionEvent,
  type SessionHealthSnapshot,
} from '@/lib/playback/session-health'
import {
  computeHeartbeatIntervalMs,
  isSessionStillValid,
  mergeSessionConfig,
  releaseSessionRenewLock,
  shouldRenewClientSession,
  tryAcquireSessionRenewLock,
  type PlaybackActivityState,
  type PlaybackSessionApiResponse,
  type PlaybackSessionClientConfig,
  type PlaybackSessionLifecycleEvent,
  type PlaybackSessionState,
} from '@/lib/playback/session-lifecycle'
import { computeBackoffWithJitter } from '@/lib/playback/session-retry'
import {
  PlaybackSessionStateMachine,
  isTerminalSessionState,
} from '@/lib/playback/session-state-machine'

interface UsePlaybackSessionOptions {
  sessionEndpoint?: string
  initialSession?: PlaybackSessionState
  lessonId?: string
  courseId?: string
  analyticsEndpoint?: string
  enabled: boolean
  playbackState?: PlaybackActivityState
  onPermanentExpiry: () => void
  onResumed?: () => void
}

interface UsePlaybackSessionResult {
  sessionState: PlaybackSessionState | null
  isRenewing: boolean
  sessionExpired: boolean
  isOffline: boolean
  machineState: string
  isLeader: boolean
  sessionHealth: SessionHealthSnapshot | null
  registerActivity: () => void
  resumePlayback: () => Promise<boolean>
}

function mapLifecycleToAnalytics(
  event: PlaybackSessionLifecycleEvent
): 'playback_started' | 'playback_error' | undefined {
  switch (event) {
    case 'SessionCreated':
    case 'SessionRenewed':
    case 'PlaybackResumed':
      return 'playback_started'
    case 'RenewalFailed':
    case 'SessionExpired':
      return 'playback_error'
    default:
      return undefined
  }
}

export function usePlaybackSession({
  sessionEndpoint,
  initialSession,
  lessonId,
  courseId,
  analyticsEndpoint,
  enabled,
  playbackState = 'idle',
  onPermanentExpiry,
  onResumed,
}: UsePlaybackSessionOptions): UsePlaybackSessionResult {
  const [sessionState, setSessionState] = useState<PlaybackSessionState | null>(
    initialSession ?? null
  )
  const [isRenewing, setIsRenewing] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [isVisible, setIsVisible] = useState(true)
  const [isLeader, setIsLeader] = useState(true)
  const [machineState, setMachineState] = useState('Idle')
  const [sessionHealth, setSessionHealth] = useState<SessionHealthSnapshot | null>(
    null
  )

  const sessionRef = useRef(sessionState)
  const renewInFlightRef = useRef(false)
  const retryAttemptRef = useRef(0)
  const configRef = useRef<PlaybackSessionClientConfig>(mergeSessionConfig())
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offlineSinceRef = useRef<number | null>(null)
  const playbackStateRef = useRef<PlaybackActivityState>(playbackState)
  const abortRef = useRef<AbortController | null>(null)

  const stateMachineRef = useRef(new PlaybackSessionStateMachine())
  const healthRef = useRef(new SessionHealthMonitor())
  const metricsRef = useRef(new SessionMetricsCollector())
  const coordinatorRef = useRef<SessionCoordinator | null>(null)
  const activityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const transition = useCallback((to: Parameters<PlaybackSessionStateMachine['transition']>[0]) => {
    if (stateMachineRef.current.transition(to)) {
      setMachineState(stateMachineRef.current.current)
    }
  }, [])

  useEffect(() => {
    sessionRef.current = sessionState
  }, [sessionState])

  useEffect(() => {
    playbackStateRef.current = playbackState
    scheduleHeartbeatRef.current?.()
  }, [playbackState])

  useEffect(() => {
    if (initialSession) {
      setSessionState(initialSession)
      setSessionExpired(false)
      healthRef.current.onSessionStart()
      metricsRef.current.recordSessionStart()
      transition('Active')
    }
  }, [initialSession, transition])

  const emitLifecycleEvent = useCallback(
    (event: PlaybackSessionLifecycleEvent, extra?: Record<string, string | boolean>) => {
      const analyticsEvent = mapLifecycleToAnalytics(event)
      if (analyticsEvent) {
        trackPlaybackEvent(analyticsEndpoint, {
          event: analyticsEvent,
          courseId,
          lessonId,
          metadata: { sessionLifecycle: event, ...extra },
        })
      }
    },
    [analyticsEndpoint, courseId, lessonId]
  )

  const updateHealth = useCallback(() => {
    setSessionHealth(
      healthRef.current.snapshot(
        sessionRef.current,
        stateMachineRef.current.current,
        coordinatorRef.current?.getIsLeader() ?? true,
        typeof navigator !== 'undefined' ? navigator.onLine : true,
        isVisible
      )
    )
  }, [isVisible])

  const applySessionResponse = useCallback(
    (data: PlaybackSessionApiResponse) => {
      if (!data.valid || !data.expiresAt || !data.renewBefore || !data.sessionId) {
        return false
      }
      const next: PlaybackSessionState = {
        sessionId: data.sessionId,
        expiresAt: data.expiresAt,
        renewBefore: data.renewBefore,
      }
      setSessionState(next)
      sessionRef.current = next
      if (data.config) {
        configRef.current = mergeSessionConfig(data.config)
      }
      coordinatorRef.current?.publishSessionUpdate(next)
      updateHealth()
      return true
    },
    [updateHealth]
  )

  const scheduleHeartbeatRef = useRef<(() => void) | null>(null)

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  const renewSession = useCallback(
    async (options?: { force?: boolean; activity?: boolean }): Promise<boolean> => {
      if (!sessionEndpoint || !enabled) return true
      if (renewInFlightRef.current) return true

      const isLeaderTab = coordinatorRef.current?.getIsLeader() ?? true
      if (!isLeaderTab) return true

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        transition('Offline')
        setIsOffline(true)
        healthRef.current.onOffline()
        logSessionEvent({ event: 'OfflineStarted', lessonId, courseId })
        return true
      }

      const current = sessionRef.current
      const force = options?.force === true
      const activity = options?.activity === true

      if (!force && !activity && current && !shouldRenewClientSession(current.renewBefore)) {
        return true
      }

      if (lessonId && !tryAcquireSessionRenewLock(lessonId, configRef.current.leaderTimeoutMs)) {
        return true
      }

      renewInFlightRef.current = true
      setIsRenewing(true)
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      const startedAt = Date.now()
      const priorState = stateMachineRef.current.current
      if (priorState === 'Active' || priorState === 'Recovering') {
        transition(activity && !force ? 'Active' : 'Renewing')
      } else if (priorState === 'Idle') {
        transition('Creating')
      }
      logSessionEvent({
        event: 'RenewalStarted',
        lessonId,
        courseId,
        machineState: stateMachineRef.current.current,
      })

      try {
        const res = await fetch(sessionEndpoint, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          signal: abortRef.current.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity,
            playbackState: playbackStateRef.current,
          }),
        })

        const latencyMs = Date.now() - startedAt
        healthRef.current.onHeartbeatComplete(latencyMs)

        if (res.status === 403) {
          transition('Expired')
          setSessionExpired(true)
          emitLifecycleEvent('SessionExpired', { reason: 'forbidden' })
          logSessionEvent({ event: 'SessionExpired', lessonId, courseId, latencyMs })
          onPermanentExpiry()
          return false
        }

        if (!res.ok) {
          throw new Error(`renew_http_${res.status}`)
        }

        const data = (await res.json()) as PlaybackSessionApiResponse
        if (!applySessionResponse(data)) {
          throw new Error('renew_invalid_response')
        }

        retryAttemptRef.current = 0
        setSessionExpired(false)
        setIsOffline(false)
        offlineSinceRef.current = null
        healthRef.current.onRenewalComplete(latencyMs)
        metricsRef.current.recordRenewal(latencyMs)
        transition('Active')

        if (data.created) {
          emitLifecycleEvent('SessionCreated')
          logSessionEvent({ event: 'SessionCreated', lessonId, courseId, latencyMs })
        } else if (data.renewed) {
          emitLifecycleEvent('SessionRenewed')
          logSessionEvent({ event: 'SessionRenewed', lessonId, courseId, latencyMs })
        } else if (data.touched) {
          logSessionEvent({ event: 'ActivityRecorded', lessonId, courseId, latencyMs })
        }
        logSessionEvent({ event: 'RenewalCompleted', lessonId, courseId, latencyMs })

        return true
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return true
        }

        healthRef.current.onValidationFailure()
        metricsRef.current.recordRenewalFailure()

        const stillValid =
          current?.expiresAt != null && isSessionStillValid(current.expiresAt)
        const offlineGraceMs =
          configRef.current.offlineGraceMinutes * 60 * 1000
        const offlineExceeded =
          offlineSinceRef.current != null &&
          Date.now() - offlineSinceRef.current > offlineGraceMs

        if (
          stillValid &&
          !offlineExceeded &&
          retryAttemptRef.current < configRef.current.maxRetries
        ) {
          retryAttemptRef.current += 1
          healthRef.current.onRetry()
          metricsRef.current.recordRetry()
          transition('Retrying')
          emitLifecycleEvent('RenewalFailed', {
            retry: true,
            attempt: String(retryAttemptRef.current),
          })

          const delay = computeBackoffWithJitter(
            retryAttemptRef.current,
            configRef.current.retryBaseMs
          )
          logSessionEvent({
            event: 'RetryScheduled',
            lessonId,
            courseId,
            retryAttempt: retryAttemptRef.current,
            metadata: { delayMs: delay },
          })

          if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
          retryTimerRef.current = setTimeout(() => {
            void renewSession({ force: true }).then((ok) => {
              if (ok) {
                logSessionEvent({ event: 'RetrySucceeded', lessonId, courseId })
                transition('Active')
              } else {
                logSessionEvent({ event: 'RetryFailed', lessonId, courseId })
              }
            })
          }, delay)

          return true
        }

        transition('Expired')
        setSessionExpired(true)
        emitLifecycleEvent('SessionExpired', { reason: 'renew_exhausted' })
        logSessionEvent({ event: 'RenewalFailed', lessonId, courseId })
        logSessionEvent({ event: 'SessionExpired', lessonId, courseId })
        onPermanentExpiry()
        return false
      } finally {
        renewInFlightRef.current = false
        setIsRenewing(false)
        if (lessonId) releaseSessionRenewLock(lessonId)
        updateHealth()
        scheduleHeartbeatRef.current?.()
      }
    },
    [
      sessionEndpoint,
      enabled,
      lessonId,
      courseId,
      applySessionResponse,
      emitLifecycleEvent,
      onPermanentExpiry,
      transition,
      updateHealth,
    ]
  )

  scheduleHeartbeatRef.current = () => {
    clearHeartbeat()
    if (!enabled || !sessionEndpoint) return

    const interval = computeHeartbeatIntervalMs(configRef.current, {
      playbackState: playbackStateRef.current,
      isVisible,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isLeader: coordinatorRef.current?.getIsLeader() ?? true,
    })

    if (interval == null) return

    heartbeatTimerRef.current = setTimeout(() => {
      const needsActivity = playbackStateRef.current !== 'idle'
      void renewSession({ activity: needsActivity }).finally(() => {
        scheduleHeartbeatRef.current?.()
      })
    }, interval)
  }

  const resumePlayback = useCallback(async () => {
    transition('Recovering')
    const ok = await renewSession({ force: true })
    if (ok) {
      setSessionExpired(false)
      emitLifecycleEvent('PlaybackResumed')
      onResumed?.()
      transition('Active')
    }
    return ok
  }, [renewSession, emitLifecycleEvent, onResumed, transition])

  const registerActivity = useCallback(() => {
    if (!enabled || !sessionEndpoint) return
    if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current)
    activityDebounceRef.current = setTimeout(() => {
      if (!renewInFlightRef.current) {
        void renewSession({ activity: true })
      }
    }, 500)
  }, [enabled, sessionEndpoint, renewSession])

  useEffect(() => {
    if (!enabled || !sessionEndpoint || !lessonId) return

    coordinatorRef.current = new SessionCoordinator({
      lessonId,
      leaderTimeoutMs: configRef.current.leaderTimeoutMs,
      onSessionUpdate: (session) => {
        setSessionState(session)
        sessionRef.current = session
        updateHealth()
      },
      onLeaderChange: (leader) => {
        setIsLeader(leader)
        metricsRef.current.recordLeaderChange()
        logSessionEvent({
          event: 'LeaderChanged',
          lessonId,
          courseId,
          isLeader: leader,
        })
        scheduleHeartbeatRef.current?.()
      },
    })
    coordinatorRef.current.start()

    return () => {
      coordinatorRef.current?.dispose()
      coordinatorRef.current = null
    }
  }, [enabled, sessionEndpoint, lessonId, courseId, updateHealth])

  useEffect(() => {
    if (!enabled || !sessionEndpoint || !sessionState) return

    void renewSession({ force: false })
    scheduleHeartbeatRef.current?.()

    return () => {
      clearHeartbeat()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current)
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current)
      abortRef.current?.abort()
    }
  }, [enabled, sessionEndpoint, sessionState?.sessionId, renewSession, clearHeartbeat])

  useEffect(() => {
    scheduleHeartbeatRef.current?.()
  }, [isVisible, isLeader, playbackState])

  useEffect(() => {
    const onVisibility = () => {
      const visible = document.visibilityState === 'visible'
      if (!visible) {
        logSessionEvent({ event: 'VisibilityHidden', lessonId, courseId })
        if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current)
        visibilityTimerRef.current = setTimeout(() => {
          setIsVisible(false)
          clearHeartbeat()
        }, configRef.current.visibilityDelayMs)
      } else {
        if (visibilityTimerRef.current) {
          clearTimeout(visibilityTimerRef.current)
          visibilityTimerRef.current = null
        }
        setIsVisible(true)
        logSessionEvent({ event: 'VisibilityVisible', lessonId, courseId })
        void renewSession({ force: true })
        scheduleHeartbeatRef.current?.()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [lessonId, courseId, renewSession, clearHeartbeat])

  useEffect(() => {
    const onOffline = () => {
      setIsOffline(true)
      offlineSinceRef.current = Date.now()
      healthRef.current.onOffline()
      transition('Offline')
      clearHeartbeat()
      logSessionEvent({ event: 'OfflineStarted', lessonId, courseId })
    }

    const onOnline = () => {
      setIsOffline(false)
      healthRef.current.onOnline()
      metricsRef.current.recordOfflineRecovery()
      transition('Recovering')
      logSessionEvent({ event: 'OfflineRecovered', lessonId, courseId })
      void renewSession({ force: true }).then(() => {
        if (!isTerminalSessionState(stateMachineRef.current.current)) {
          transition('Active')
        }
        scheduleHeartbeatRef.current?.()
      })
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [lessonId, courseId, renewSession, clearHeartbeat, transition])

  useEffect(() => {
    if (!isOffline || !offlineSinceRef.current) return

    const graceMs = configRef.current.offlineGraceMinutes * 60 * 1000
    const timer = setInterval(() => {
      if (
        offlineSinceRef.current &&
        Date.now() - offlineSinceRef.current > graceMs &&
        typeof navigator !== 'undefined' &&
        !navigator.onLine
      ) {
        transition('Expired')
        setSessionExpired(true)
        emitLifecycleEvent('SessionExpired', { reason: 'offline_grace_exceeded' })
        onPermanentExpiry()
      }
    }, 5_000)

    return () => clearInterval(timer)
  }, [isOffline, emitLifecycleEvent, onPermanentExpiry, transition])

  useEffect(() => {
    const interval = setInterval(updateHealth, 5_000)
    return () => clearInterval(interval)
  }, [updateHealth])

  return {
    sessionState,
    isRenewing,
    sessionExpired,
    isOffline,
    machineState,
    isLeader,
    sessionHealth,
    registerActivity,
    resumePlayback,
  }
}
