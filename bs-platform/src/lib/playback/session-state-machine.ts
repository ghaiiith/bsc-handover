export type PlaybackSessionMachineState =
  | 'Idle'
  | 'Creating'
  | 'Active'
  | 'Renewing'
  | 'Retrying'
  | 'Offline'
  | 'Recovering'
  | 'Expired'
  | 'Failed'
  | 'Destroyed'

const VALID_TRANSITIONS: Record<
  PlaybackSessionMachineState,
  PlaybackSessionMachineState[]
> = {
  Idle: ['Creating', 'Destroyed'],
  Creating: ['Active', 'Failed', 'Offline', 'Destroyed'],
  Active: ['Renewing', 'Offline', 'Expired', 'Failed', 'Destroyed'],
  Renewing: ['Active', 'Retrying', 'Failed', 'Offline', 'Destroyed'],
  Retrying: ['Renewing', 'Active', 'Expired', 'Failed', 'Offline', 'Destroyed'],
  Offline: ['Recovering', 'Expired', 'Failed', 'Destroyed'],
  Recovering: ['Active', 'Renewing', 'Expired', 'Failed', 'Destroyed'],
  Expired: ['Recovering', 'Destroyed'],
  Failed: ['Recovering', 'Destroyed'],
  Destroyed: [],
}

export class PlaybackSessionStateMachine {
  private state: PlaybackSessionMachineState = 'Idle'

  get current(): PlaybackSessionMachineState {
    return this.state
  }

  canTransition(to: PlaybackSessionMachineState): boolean {
    return VALID_TRANSITIONS[this.state].includes(to)
  }

  transition(to: PlaybackSessionMachineState): boolean {
    if (!this.canTransition(to)) return false
    this.state = to
    return true
  }

  forceTransition(to: PlaybackSessionMachineState): void {
    this.state = to
  }

  reset(): void {
    this.state = 'Idle'
  }
}

export function isTerminalSessionState(
  state: PlaybackSessionMachineState
): boolean {
  return state === 'Expired' || state === 'Failed' || state === 'Destroyed'
}
