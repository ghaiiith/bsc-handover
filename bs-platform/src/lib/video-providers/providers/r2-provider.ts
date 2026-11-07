import 'server-only'

import type { VideoAsset } from '@/types'
import type { VideoProvider } from '@/lib/video-providers/provider-interface'
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
} from '@/lib/video-providers/types'
import { getStorageProvider, isStorageConfigured } from '@/lib/storage/provider'
import { resolveLessonSlot, sourceVideoKey } from '@/lib/storage/object-keys'
import {
  buildLessonHlsProxyPath,
  isLessonHlsReady,
} from '@/lib/video/hls-playback'
import { isLessonEncrypted } from '@/lib/video/encryption-keys'
import {
  createPendingVideoAsset,
  getVideoAssetById,
  markVideoAssetFailed,
  markVideoAssetReady,
} from '@/lib/video/video-asset-service'
import { estimateR2Cost } from '@/lib/video-providers/cost-estimator'

/** Advanced provider — wraps existing Phase 1–3 R2 / HLS / encryption pipeline. */
export class R2VideoProvider implements VideoProvider {
  readonly id = 'r2' as const
  readonly displayName = 'Cloudflare R2'

  async initialize(): Promise<void> {
    /* env validated on first use */
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now()
    if (!isStorageConfigured()) {
      return {
        status: 'offline',
        latencyMs: Date.now() - start,
        error: 'R2 not configured',
        checkedAt: new Date().toISOString(),
      }
    }
    try {
      const provider = getStorageProvider()
      await provider.headObject('courses/.health-check')
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        storageStatus: 'reachable',
        checkedAt: new Date().toISOString(),
      }
    } catch (err) {
      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'health check failed',
        checkedAt: new Date().toISOString(),
      }
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      hls: true,
      encryption: true,
      processing: true,
      drm: false,
      transcoding: true,
      signedPlayback: true,
      domainRestriction: true,
      privateVideo: true,
      directUpload: true,
    }
  }

  async createUpload(input: CreateUploadInput): Promise<CreateUploadResult> {
    if (input.slot === 'lesson' && !input.lessonId) {
      throw new Error('lesson_required')
    }
    const lessonSlot = resolveLessonSlot(input.slot, input.lessonId)
    const objectKey = sourceVideoKey(input.courseId, lessonSlot)

    const asset = await createPendingVideoAsset({
      courseId: input.courseId,
      objectKey,
      mimeType: input.contentType,
      originalFilename: input.filename,
      createdBy: input.createdBy,
      provider: 'r2',
    })

    if (!asset) throw new Error('asset_create_failed')

    const storage = getStorageProvider()
    const multipart = await storage.createMultipartUpload({
      key: objectKey,
      contentType: input.contentType,
      partCount: input.partCount ?? 1,
    })

    return {
      assetId: asset.id,
      provider: 'r2',
      key: multipart.key,
      uploadId: multipart.uploadId,
      parts: multipart.parts,
    }
  }

  async completeUpload(input: CompleteUploadInput): Promise<VideoAsset | null> {
    if (!input.objectKey || !input.uploadId || !input.parts) {
      throw new Error('invalid_r2_complete_payload')
    }

    const storage = getStorageProvider()
    try {
      await storage.completeMultipartUpload({
        key: input.objectKey,
        uploadId: input.uploadId,
        parts: input.parts,
      })
    } catch {
      await markVideoAssetFailed(input.assetId)
      return null
    }

    return markVideoAssetReady({
      id: input.assetId,
      fileSize: input.fileSize,
      durationSeconds: input.durationSeconds,
      mimeType: input.mimeType,
    })
  }

  async abortUpload(input: AbortUploadInput): Promise<void> {
    if (input.objectKey && input.uploadId) {
      await getStorageProvider().abortMultipartUpload({
        key: input.objectKey,
        uploadId: input.uploadId,
      })
    }
  }

  async deleteVideo(asset: VideoAsset): Promise<void> {
    await getStorageProvider().deleteObject(asset.object_key)
  }

  async deleteAssets(asset: VideoAsset): Promise<void> {
    const prefix = asset.object_key.replace(/\/source\/video\.mp4$/, '/')
    await getStorageProvider().deletePrefix(prefix)
  }

  async getVideo(asset: VideoAsset): Promise<ProviderVideoMetadata | null> {
    return this.getMetadata(asset)
  }

  async getMetadata(asset: VideoAsset): Promise<ProviderVideoMetadata | null> {
    return {
      durationSeconds: asset.duration_seconds ?? undefined,
      fileSize: asset.file_size ?? undefined,
      status: asset.status,
    }
  }

  async getThumbnail(_asset: VideoAsset): Promise<string | null> {
    return null
  }

  async refreshMetadata(asset: VideoAsset): Promise<ProviderVideoMetadata | null> {
    return this.getMetadata(asset)
  }

  async syncStatus(asset: VideoAsset): Promise<VideoAsset | null> {
    return getVideoAssetById(asset.id)
  }

  async publish(asset: VideoAsset): Promise<VideoAsset | null> {
    return getVideoAssetById(asset.id)
  }

  async unpublish(asset: VideoAsset): Promise<VideoAsset | null> {
    return getVideoAssetById(asset.id)
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackResult | null> {
    const { asset, courseId, lessonId, ttlSeconds = 60 * 60 * 6 } = input
    if (asset.status !== 'ready') return null

    const url = await getStorageProvider().getSignedDownloadUrl({
      key: asset.object_key,
      ttlSeconds,
    })

    if (!url) return null

    let hlsUrl: string | undefined
    let encrypted = false
    if (lessonId) {
      const hlsReady = await isLessonHlsReady(courseId, lessonId)
      if (hlsReady) {
        hlsUrl = buildLessonHlsProxyPath(courseId, lessonId)
        encrypted = await isLessonEncrypted(courseId, lessonId)
      }
    }

    return {
      provider: 'r2',
      mode: hlsUrl ? 'hls_proxy' : 'signed_mp4',
      url,
      hlsUrl,
      encrypted,
    }
  }

  async getAnalytics(_asset: VideoAsset): Promise<Record<string, unknown>> {
    return {}
  }

  async estimateCost(asset: VideoAsset): Promise<ProviderCostEstimate> {
    return estimateR2Cost(asset)
  }

  supportsHLS(): boolean {
    return true
  }
  supportsEncryption(): boolean {
    return true
  }
  supportsProcessing(): boolean {
    return true
  }
  supportsDRM(): boolean {
    return false
  }
  supportsTranscoding(): boolean {
    return true
  }
  supportsSignedPlayback(): boolean {
    return true
  }
  supportsDomainRestriction(): boolean {
    return true
  }
  supportsPrivateVideo(): boolean {
    return true
  }
  supportsDirectUpload(): boolean {
    return true
  }
}
