import type { PlaybackSessionState } from '@/lib/playback/session-lifecycle'

const CHANNEL_PREFIX = 'bs-playback-session:'

export interface SessionCoordinatorMessage {
  type: 'leader_claim' | 'leader_heartbeat' | 'session_update' | 'leader_release'
  tabId: string
  lessonId: string
  timestamp: number
  session?: PlaybackSessionState
}

export interface SessionCoordinatorOptions {
  lessonId: string
  leaderTimeoutMs: number
  onSessionUpdate: (session: PlaybackSessionState) => void
  onLeaderChange: (isLeader: boolean) => void
}

export class SessionCoordinator {
  private readonly tabId: string
  private readonly lessonId: string
  private readonly leaderTimeoutMs: number
  private readonly onSessionUpdate: (session: PlaybackSessionState) => void
  private readonly onLeaderChange: (isLeader: boolean) => void
  private channel: BroadcastChannel | null = null
  private isLeader = false
  private leaderHeartbeatTimer: number | null = null
  private leaderCheckTimer: number | null = null
  private lastLeaderPing = 0

  constructor(options: SessionCoordinatorOptions) {
    this.tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.lessonId = options.lessonId
    this.leaderTimeoutMs = options.leaderTimeoutMs
    this.onSessionUpdate = options.onSessionUpdate
    this.onLeaderChange = options.onLeaderChange
  }

  start(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      this.becomeLeader()
      return
    }

    this.channel = new BroadcastChannel(`${CHANNEL_PREFIX}${this.lessonId}`)
    this.channel.onmessage = (event: MessageEvent<SessionCoordinatorMessage>) => {
      this.handleMessage(event.data)
    }

    this.tryBecomeLeader()
    this.leaderCheckTimer = window.setInterval(() => {
      if (
        !this.isLeader &&
        Date.now() - this.lastLeaderPing > this.leaderTimeoutMs
      ) {
        this.tryBecomeLeader()
      }
    }, Math.max(2_000, this.leaderTimeoutMs / 2))
  }

  private handleMessage(message: SessionCoordinatorMessage): void {
    if (message.lessonId !== this.lessonId) return

    if (message.type === 'leader_claim' || message.type === 'leader_heartbeat') {
      this.lastLeaderPing = message.timestamp
      if (message.tabId !== this.tabId && this.isLeader) {
        if (message.timestamp > Date.now() - this.leaderTimeoutMs) {
          this.resignLeader()
        }
      }
    }

    if (message.type === 'session_update' && message.session && !this.isLeader) {
      this.onSessionUpdate(message.session)
    }

    if (message.type === 'leader_release' && !this.isLeader) {
      this.tryBecomeLeader()
    }
  }

  private tryBecomeLeader(): void {
    if (this.isLeader) return
    if (Date.now() - this.lastLeaderPing < this.leaderTimeoutMs) return
    this.becomeLeader()
    this.broadcast({
      type: 'leader_claim',
      tabId: this.tabId,
      lessonId: this.lessonId,
      timestamp: Date.now(),
    })
  }

  private becomeLeader(): void {
    if (this.isLeader) return
    this.isLeader = true
    this.onLeaderChange(true)
    this.leaderHeartbeatTimer = window.setInterval(() => {
      this.broadcast({
        type: 'leader_heartbeat',
        tabId: this.tabId,
        lessonId: this.lessonId,
        timestamp: Date.now(),
      })
    }, Math.floor(this.leaderTimeoutMs / 2))
  }

  private resignLeader(): void {
    if (!this.isLeader) return
    this.isLeader = false
    this.onLeaderChange(false)
    if (this.leaderHeartbeatTimer) {
      clearInterval(this.leaderHeartbeatTimer)
      this.leaderHeartbeatTimer = null
    }
  }

  publishSessionUpdate(session: PlaybackSessionState): void {
    if (!this.isLeader) return
    this.broadcast({
      type: 'session_update',
      tabId: this.tabId,
      lessonId: this.lessonId,
      timestamp: Date.now(),
      session,
    })
  }

  private broadcast(message: SessionCoordinatorMessage): void {
    this.channel?.postMessage(message)
  }

  getIsLeader(): boolean {
    return this.isLeader
  }

  dispose(): void {
    if (this.isLeader) {
      this.broadcast({
        type: 'leader_release',
        tabId: this.tabId,
        lessonId: this.lessonId,
        timestamp: Date.now(),
      })
    }
    if (this.leaderHeartbeatTimer) clearInterval(this.leaderHeartbeatTimer)
    if (this.leaderCheckTimer) clearInterval(this.leaderCheckTimer)
    this.channel?.close()
    this.channel = null
    this.isLeader = false
  }
}
