import type { VideoAsset } from '@/types'

export type VideoProviderId =
  | 'vimeo'
  | 'r2'
  | 'aws'
  | 'backblaze'
  | 'mux'
  | 'bunny'
  | 'cloudinary'

export type ProviderHealthStatus = 'healthy' | 'warning' | 'degraded' | 'offline'

export interface ProviderCapabilities {
  hls: boolean
  encryption: boolean
  processing: boolean
  drm: boolean
  transcoding: boolean
  signedPlayback: boolean
  domainRestriction: boolean
  privateVideo: boolean
  directUpload: boolean
}

export interface ProviderCostEstimate {
  storageCostUsd: number
  uploadCostUsd: number
  streamingCostUsd: number
  processingCostUsd: number
  apiCostUsd: number
  monthlyCostUsd: number
  yearlyCostUsd: number
}

export interface ProviderHealthResult {
  status: ProviderHealthStatus
  latencyMs: number
  apiResponseMs?: number
  uploadResponseMs?: number
  playbackResponseMs?: number
  storageStatus?: string
  error?: string
  checkedAt: string
}

export interface CreateUploadInput {
  courseId: string
  lessonId?: string | null
  slot: 'lesson' | 'preview'
  filename: string
  contentType: string
  fileSize: number
  partCount?: number
  createdBy: string
}

export interface CreateUploadResult {
  assetId: string
  provider: VideoProviderId
  /** R2 multipart */
  key?: string
  uploadId?: string
  parts?: Array<{ partNumber: number; url: string }>
  /** Vimeo direct upload */
  vimeoVideoId?: string
  uploadLink?: string
  uploadApproach?: 'tus' | 'post'
}

export interface CompleteUploadInput {
  assetId: string
  courseId: string
  /** R2 */
  objectKey?: string
  uploadId?: string
  parts?: Array<{ partNumber: number; etag: string }>
  fileSize?: number
  mimeType?: string
  durationSeconds?: number
  /** Vimeo */
  vimeoVideoId?: string
}

export interface AbortUploadInput {
  assetId: string
  objectKey?: string
  uploadId?: string
}

export interface PlaybackInput {
  asset: VideoAsset
  courseId: string
  lessonId?: string
  ttlSeconds?: number
  userId?: string | null
}

export interface PlaybackResult {
  provider: VideoProviderId
  mode: 'signed_mp4' | 'hls_proxy' | 'vimeo_embed'
  url?: string
  hlsUrl?: string
  embedUrl?: string
  encrypted?: boolean
}

export interface ProviderVideoMetadata {
  durationSeconds?: number
  width?: number
  height?: number
  fileSize?: number
  thumbnailUrl?: string
  playbackUrl?: string
  status?: string
  codec?: string
  bitrate?: number
}

export interface ProviderSettingsRow {
  provider_id: VideoProviderId
  enabled: boolean
  is_primary: boolean
  priority: number
  status: ProviderHealthStatus
  region: string | null
  settings: Record<string, unknown>
  last_health_check: string | null
  last_error: string | null
  estimated_monthly_cost_usd: number
  estimated_storage_cost_usd: number
  estimated_streaming_cost_usd: number
  estimated_upload_cost_usd: number
  estimated_api_cost_usd: number
}
