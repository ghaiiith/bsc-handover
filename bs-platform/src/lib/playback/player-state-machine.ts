import type { PlayerUIState } from '@/types/video-player'

const VALID_TRANSITIONS: Record<PlayerUIState, PlayerUIState[]> = {
  Idle: ['Loading', 'Ready'],
  Loading: ['Ready', 'Error'],
  Ready: ['Playing', 'Paused', 'Buffering', 'Seeking', 'Error', 'Fullscreen'],
  Playing: ['Paused', 'Buffering', 'Seeking', 'Completed', 'Error', 'Fullscreen', 'PictureInPicture', 'Offline'],
  Paused: ['Playing', 'Seeking', 'Completed', 'Fullscreen', 'PictureInPicture'],
  Buffering: ['Playing', 'Paused', 'Error', 'Offline'],
  Seeking: ['Playing', 'Paused', 'Buffering'],
  Completed: ['Playing', 'Ready'],
  Error: ['Loading', 'Ready'],
  Offline: ['Recovering', 'Error'],
  Recovering: ['Playing', 'Paused', 'Ready', 'Error'],
  PictureInPicture: ['Playing', 'Paused', 'Ready'],
  Fullscreen: ['Playing', 'Paused', 'Ready'],
}

export class PlayerUIStateMachine {
  private state: PlayerUIState = 'Idle'

  get current(): PlayerUIState {
    return this.state
  }

  canTransition(to: PlayerUIState): boolean {
    return VALID_TRANSITIONS[this.state].includes(to)
  }

  transition(to: PlayerUIState): boolean {
    if (!this.canTransition(to)) return false
    this.state = to
    return true
  }

  forceTransition(to: PlayerUIState): void {
    this.state = to
  }

  reset(): void {
    this.state = 'Idle'
  }
}

export function mapEngineToUIState(
  engineState: string,
  extras?: { isFullscreen?: boolean; isPiP?: boolean; isOffline?: boolean; showEnd?: boolean }
): PlayerUIState {
  if (extras?.showEnd) return 'Completed'
  if (extras?.isOffline) return 'Offline'
  if (extras?.isPiP) return 'PictureInPicture'
  if (extras?.isFullscreen) return 'Fullscreen'

  switch (engineState) {
    case 'loading':
      return 'Loading'
    case 'ready':
      return 'Ready'
    case 'playing':
      return 'Playing'
    case 'paused':
      return 'Paused'
    case 'buffering':
      return 'Buffering'
    case 'ended':
      return 'Completed'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}
