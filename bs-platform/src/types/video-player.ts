import type { LessonPlaybackMetadata, PlaybackProtectionCapabilities, WatermarkConfig } from '@/types/content-protection'

export type { LessonPlaybackMetadata } from '@/types/content-protection'

/** Platform-level playback error codes — never expose provider errors to students. */
export type PlatformPlaybackErrorCode =
  | 'network_lost'
  | 'unavailable'
  | 'permission_denied'
  | 'processing'
  | 'restricted'
  | 'session_expired'

export type PlaybackEngineType = 'html5' | 'hls' | 'embed'

export type PlaybackEngineState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error'

/** Internal UI state machine — separate from engine state. */
export type PlayerUIState =
  | 'Idle'
  | 'Loading'
  | 'Ready'
  | 'Playing'
  | 'Paused'
  | 'Buffering'
  | 'Seeking'
  | 'Completed'
  | 'Error'
  | 'Offline'
  | 'Recovering'
  | 'PictureInPicture'
  | 'Fullscreen'

export interface PlaybackQuality {
  id: string
  label: string
  height: number
  bitrate?: number
}

export interface PlaybackSubtitleTrack {
  id: string
  label: string
  language: string
  src?: string
  kind?: 'subtitles' | 'captions' | 'descriptions'
  default?: boolean
}

export interface PlaybackAudioTrack {
  id: string
  label: string
  language: string
}

export interface PlaybackWatermarkContext {
  displayName?: string
  userId?: string
  lessonTitle?: string
  courseTitle?: string
}

/** Capability-driven player features — never check provider names in UI. */
export interface PlayerCapabilities {
  supportsResume: boolean
  supportsBookmarks: boolean
  supportsPlaybackSession: boolean
  supportsChapters: boolean
  supportsSubtitles: boolean
  supportsQualitySelection: boolean
  supportsPlaybackRates: boolean
  supportsPiP: boolean
  supportsFullscreen: boolean
  supportsWatermark: boolean
  supportsDrm: boolean
  supportsThumbnailPreview: boolean
  supportsInteractiveTimeline: boolean
  supportsNotes: boolean
  supportsQuizzes: boolean
}

export interface PlayerChapter {
  id: string
  title: string
  startSeconds: number
  endSeconds?: number
}

export type TimelineEventType =
  | 'quiz'
  | 'assignment'
  | 'poll'
  | 'announcement'
  | 'resource'
  | 'download'
  | 'certificate'

export interface PlayerTimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  startSeconds: number
  metadata?: Record<string, string | number | boolean>
}

export interface PlayerBookmark {
  id: string
  timestampSeconds: number
  title?: string | null
  createdAt: string
}

export interface LessonWatchProgress {
  watchPositionSeconds: number
  completionPercent: number
  lastWatchedAt: string | null
  completed: boolean
}

/** Phase 2 seek preview — thumbnail sprite metadata from Desktop Studio. */
export interface SeekPreviewSprites {
  baseUrl: string
  intervalSeconds: number
  columns: number
  rows: number
  thumbWidth: number
  thumbHeight: number
  totalFrames: number
}

/** Note infrastructure — UI hidden until feature enabled. */
export interface PlayerNoteEvent {
  lessonId: string
  timestampSeconds: number
  content?: string
}

/** Future AI feature interfaces — no UI today. */
export interface PlayerAiCapabilities {
  supportsSummary: boolean
  supportsChapters: boolean
  supportsTranscript: boolean
  supportsSearch: boolean
  supportsAskAi: boolean
  supportsTranslation: boolean
  supportsVoiceNotes: boolean
  supportsSmartBookmarks: boolean
  supportsKnowledgeTimeline: boolean
}

/** Resolved playback config — provider details stripped before reaching UI. */
export interface ResolvedPlaybackConfig {
  engine: PlaybackEngineType
  streamUrl?: string
  hlsUrl?: string
  mp4FallbackUrl?: string
  embedUrl?: string
  poster?: string | null
  sessionEndpoint?: string
  watermark?: WatermarkConfig
  watermarkContext?: PlaybackWatermarkContext
  metadata?: LessonPlaybackMetadata
  subtitles?: PlaybackSubtitleTrack[]
  chapters?: PlayerChapter[]
  timelineEvents?: PlayerTimelineEvent[]
  seekPreview?: SeekPreviewSprites
  capabilities?: PlayerCapabilities
  aiCapabilities?: PlayerAiCapabilities
  session?: {
    sessionId: string
    expiresAt: string
    renewBefore: string
  }
  adminDebug?: PlaybackAdminDebug
}

export interface PlaybackAdminDebug {
  providerId?: string
  sessionId?: string
  playbackMode?: string
  resolution?: string
  codec?: string
  bitrate?: number
}

export interface PlayerPreferences {
  playbackRate: number
  quality: 'auto' | number
  subtitleId: string | null
  subtitleSize: 'sm' | 'md' | 'lg'
  subtitleColor: string
  subtitleBackground: boolean
  autoQuality: boolean
  volume: number
  muted: boolean
  rememberPreferences: boolean
  focusMode: boolean
  cinemaMode: boolean
  autoplayNext: boolean
  pipEnabled: boolean
}

export type PlaybackAnalyticsEvent =
  | 'playback_started'
  | 'playback_paused'
  | 'playback_resumed'
  | 'playback_seeked'
  | 'playback_replayed'
  | 'playback_completed'
  | 'playback_error'
  | 'playback_dropped'
  | 'quality_changed'
  | 'speed_changed'
  | 'subtitle_changed'
  | 'buffer_start'
  | 'buffer_end'
  | 'fullscreen_enter'
  | 'fullscreen_exit'
  | 'pip_enter'
  | 'pip_exit'
  | 'bookmark_added'
  | 'bookmark_removed'
  | 'resume_prompt_shown'
  | 'resume_accepted'
  | 'resume_declined'

export interface PlaybackAnalyticsPayload {
  event: PlaybackAnalyticsEvent
  courseId?: string
  lessonId?: string
  currentTime?: number
  duration?: number
  quality?: string
  playbackRate?: number
  errorCode?: PlatformPlaybackErrorCode
  metadata?: Record<string, string | number | boolean>
}

export interface PlayerDebugSnapshot {
  capabilities?: PlayerCapabilities
  uiState: string
  engineState: string
  bufferedPercent: number
  currentBitrate?: number
  droppedFrames?: number
  networkState?: string
  isOnline: boolean
  seekCount: number
  averageWatchTimeMs: number
}

/** Internal subtitle feature flag — UI hidden until multilingual content ships. */
export const SUBTITLE_UI_ENABLED = false

export type { PlaybackProtectionCapabilities }
