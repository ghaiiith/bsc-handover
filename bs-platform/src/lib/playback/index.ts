export { createPlaybackAdapter } from '@/lib/playback/adapters'
export type { PlaybackAdapter, PlaybackAdapterInitOptions } from '@/lib/playback/adapter-interface'
export { trackPlaybackEvent, flushPlaybackAnalytics } from '@/lib/playback/analytics'
export { getPlatformErrorKey, mapNativeError } from '@/lib/playback/errors'
export {
  buildSessionEndpoint,
  mapFetchErrorToPlatformError,
  mapHttpStatusToError,
  resolvePlaybackConfig,
} from '@/lib/playback/resolver'
export {
  computeBackoffMs,
  isSessionStillValid,
  shouldRenewClientSession,
  tryAcquireSessionRenewLock,
  releaseSessionRenewLock,
} from '@/lib/playback/session-lifecycle'
export type {
  PlaybackSessionApiResponse,
  PlaybackSessionLifecycleEvent,
  PlaybackSessionState,
} from '@/lib/playback/session-lifecycle'
export {
  formatPlaybackTime,
  loadPlayerPreferences,
  savePlayerPreferences,
} from '@/lib/playback/preferences'
