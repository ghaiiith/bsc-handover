import type { VideoAsset } from '@/types'
import type {
  AbortUploadInput,
  CompleteUploadInput,
  CreateUploadInput,
  CreateUploadResult,
  PlaybackInput,
  PlaybackResult,
  ProviderCapabilities,
  ProviderCostEstimate,
  ProviderHealthResult,
  ProviderVideoMetadata,
  VideoProviderId,
} from '@/lib/video-providers/types'

/** Contract every video provider must implement. */
export interface VideoProvider {
  readonly id: VideoProviderId
  readonly displayName: string

  initialize(): Promise<void>
  healthCheck(): Promise<ProviderHealthResult>
  getCapabilities(): ProviderCapabilities

  createUpload(input: CreateUploadInput): Promise<CreateUploadResult>
  completeUpload(input: CompleteUploadInput): Promise<VideoAsset | null>
  abortUpload(input: AbortUploadInput): Promise<void>

  deleteVideo(asset: VideoAsset): Promise<void>
  deleteAssets(asset: VideoAsset): Promise<void>

  getVideo(asset: VideoAsset): Promise<ProviderVideoMetadata | null>
  getMetadata(asset: VideoAsset): Promise<ProviderVideoMetadata | null>
  getThumbnail(asset: VideoAsset): Promise<string | null>
  refreshMetadata(asset: VideoAsset): Promise<ProviderVideoMetadata | null>
  syncStatus(asset: VideoAsset): Promise<VideoAsset | null>

  publish(asset: VideoAsset): Promise<VideoAsset | null>
  unpublish(asset: VideoAsset): Promise<VideoAsset | null>

  getPlayback(input: PlaybackInput): Promise<PlaybackResult | null>
  getAnalytics(asset: VideoAsset): Promise<Record<string, unknown>>

  estimateCost(asset: VideoAsset): Promise<ProviderCostEstimate>

  supportsHLS(): boolean
  supportsEncryption(): boolean
  supportsProcessing(): boolean
  supportsDRM(): boolean
  supportsTranscoding(): boolean
  supportsSignedPlayback(): boolean
  supportsDomainRestriction(): boolean
  supportsPrivateVideo(): boolean
  supportsDirectUpload(): boolean
}
