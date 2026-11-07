import type { VideoProvider } from '@/lib/video-providers/provider-interface'
import type {
  ProviderCapabilities,
  ProviderCostEstimate,
  ProviderHealthResult,
} from '@/lib/video-providers/types'
import type { VideoAsset } from '@/types'

/** Shared stub — future provider placeholder. */
export abstract class FutureVideoProviderStub implements VideoProvider {
  abstract readonly id: VideoProvider['id']
  abstract readonly displayName: string

  async initialize(): Promise<void> {}

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      status: 'offline',
      latencyMs: 0,
      error: 'Provider not yet implemented',
      checkedAt: new Date().toISOString(),
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      hls: false,
      encryption: false,
      processing: false,
      drm: false,
      transcoding: false,
      signedPlayback: false,
      domainRestriction: false,
      privateVideo: false,
      directUpload: false,
    }
  }

  notImplemented(): never {
    throw new Error(`${this.displayName} provider is not yet implemented`)
  }

  createUpload() {
    return this.notImplemented()
  }
  completeUpload() {
    return this.notImplemented()
  }
  abortUpload() {
    return this.notImplemented()
  }
  deleteVideo() {
    return this.notImplemented()
  }
  deleteAssets() {
    return this.notImplemented()
  }
  getVideo() {
    return this.notImplemented()
  }
  getMetadata() {
    return this.notImplemented()
  }
  getThumbnail() {
    return this.notImplemented()
  }
  refreshMetadata() {
    return this.notImplemented()
  }
  syncStatus() {
    return this.notImplemented()
  }
  publish() {
    return this.notImplemented()
  }
  unpublish() {
    return this.notImplemented()
  }
  getPlayback() {
    return this.notImplemented()
  }
  async getAnalytics(_asset: VideoAsset): Promise<Record<string, unknown>> {
    return {}
  }
  async estimateCost(_asset: VideoAsset): Promise<ProviderCostEstimate> {
    return {
      storageCostUsd: 0,
      uploadCostUsd: 0,
      streamingCostUsd: 0,
      processingCostUsd: 0,
      apiCostUsd: 0,
      monthlyCostUsd: 0,
      yearlyCostUsd: 0,
    }
  }

  supportsHLS(): boolean {
    return false
  }
  supportsEncryption(): boolean {
    return false
  }
  supportsProcessing(): boolean {
    return false
  }
  supportsDRM(): boolean {
    return false
  }
  supportsTranscoding(): boolean {
    return false
  }
  supportsSignedPlayback(): boolean {
    return false
  }
  supportsDomainRestriction(): boolean {
    return false
  }
  supportsPrivateVideo(): boolean {
    return false
  }
  supportsDirectUpload(): boolean {
    return false
  }
}
