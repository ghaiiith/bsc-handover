export type EncryptionStatus = 'none' | 'pending' | 'encrypted' | 'failed'
export type ProtectionStatus = 'standard' | 'protected' | 'degraded'
export type AssetHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'critical'

export type SecurityEventType =
  | 'playback_started'
  | 'playback_finished'
  | 'playback_failed'
  | 'playback_terminated'
  | 'unauthorized_request'
  | 'key_request'
  | 'key_validation_failed'
  | 'session_expired'
  | 'session_renewed'
  | 'session_device_mismatch'
  | 'session_ip_changed'
  | 'hotlink_attempt'
  | 'asset_validation'

export interface LessonContentProtection {
  lesson_id: string
  course_id: string
  encryption_status: EncryptionStatus
  protection_status: ProtectionStatus
  asset_health: AssetHealthStatus
  asset_health_details: AssetHealthReport | null
  last_validation_at: string | null
  last_validation_version: number
  updated_at: string
}

export interface AssetHealthReport {
  overall: AssetHealthStatus
  checkedAt: string
  masterPlaylist: HealthCheckResult
  variants: HealthCheckResult[]
  encryption: HealthCheckResult
  metadata: HealthCheckResult
  thumbnails: HealthCheckResult
  issues: string[]
}

export interface HealthCheckResult {
  status: 'ok' | 'warning' | 'error' | 'skipped'
  message?: string
}

export interface PlaybackSessionInfo {
  sessionId: string
  expiresAt: string
  renewBefore: string
}

export interface WatermarkConfig {
  enabled: boolean
  opacity: number
  fontSize: number
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  updateIntervalSeconds: number
  lines: Array<'displayName' | 'userId' | 'timestamp' | 'lessonTitle' | 'courseTitle'>
}

export interface LessonPlaybackMetadata {
  courseName: string
  moduleName: string
  lessonName: string
  lessonNumber: number
  totalLessons: number
  courseProgress: number
  durationMinutes: number
}

export interface PlaybackProtectionCapabilities {
  requiresPlaybackSession: boolean
  supportsEncryptedHls: boolean
  supportsSignedPlayback: boolean
  supportsCookieValidation: boolean
  supportsDrm: boolean
}

export interface SecurePlaybackResponse {
  status: 'ready' | 'none' | 'pending' | 'uploading' | 'failed'
  /** Internal — only included for admin diagnostics; stripped for students. */
  provider?: string
  playbackMode?: 'signed_mp4' | 'hls_proxy' | 'vimeo_embed'
  url?: string
  hlsUrl?: string
  embedUrl?: string
  encrypted?: boolean
  playbackProtection?: PlaybackProtectionCapabilities
  session?: PlaybackSessionInfo
  watermark?: WatermarkConfig
  watermarkContext?: {
    displayName?: string
    userId?: string
    lessonTitle?: string
    courseTitle?: string
  }
  metadata?: LessonPlaybackMetadata
  expiresAt?: string
}

export interface StudioProtectionStatus {
  lessonId: string
  courseId: string
  encryptionStatus: EncryptionStatus
  protectionStatus: ProtectionStatus
  assetHealth: AssetHealthStatus
  assetHealthDetails: AssetHealthReport | null
  lastValidationAt: string | null
  keyRegistered: boolean
  encryptionVersion: number
  processingVersion: number
}
