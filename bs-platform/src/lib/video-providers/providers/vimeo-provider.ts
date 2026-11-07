import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
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
import {
  createPendingVideoAsset,
  getVideoAssetById,
  markVideoAssetFailed,
  markVideoAssetReady,
} from '@/lib/video/video-asset-service'
import { estimateVimeoCost } from '@/lib/video-providers/cost-estimator'
import { resolveLessonSlot } from '@/lib/storage/object-keys'

const VIMEO_API = 'https://api.vimeo.com'

function getVimeoToken(): string | null {
  return process.env.VIMEO_ACCESS_TOKEN?.trim() || null
}

function vimeoHeaders(): HeadersInit {
  const token = getVimeoToken()
  if (!token) throw new Error('VIMEO_ACCESS_TOKEN not configured')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.vimeo.*+json;version=3.4',
    'Content-Type': 'application/json',
  }
}

function parseVimeoId(uri: string): string {
  const parts = uri.split('/')
  return parts[parts.length - 1] ?? uri
}

/** Primary provider — direct browser upload + secure embed playback. */
export class VimeoVideoProvider implements VideoProvider {
  readonly id = 'vimeo' as const
  readonly displayName = 'Vimeo'

  async initialize(): Promise<void> {
    /* token validated on first API call */
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now()
    if (!getVimeoToken()) {
      return {
        status: 'offline',
        latencyMs: Date.now() - start,
        error: 'VIMEO_ACCESS_TOKEN not configured',
        checkedAt: new Date().toISOString(),
      }
    }
    try {
      const apiStart = Date.now()
      const res = await fetch(`${VIMEO_API}/me`, { headers: vimeoHeaders() })
      const apiResponseMs = Date.now() - apiStart
      if (!res.ok) {
        const text = await res.text()
        return {
          status: 'degraded',
          latencyMs: Date.now() - start,
          apiResponseMs,
          error: text.slice(0, 200),
          checkedAt: new Date().toISOString(),
        }
      }
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        apiResponseMs,
        checkedAt: new Date().toISOString(),
      }
    } catch (err) {
      return {
        status: 'offline',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Vimeo unreachable',
        checkedAt: new Date().toISOString(),
      }
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      hls: true,
      encryption: false,
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
    const lessonSlot = resolveLessonSlot(input.slot, input.lessonId)
    const placeholderKey = `vimeo/${input.courseId}/${lessonSlot}`

    const asset = await createPendingVideoAsset({
      courseId: input.courseId,
      objectKey: placeholderKey,
      mimeType: input.contentType,
      originalFilename: input.filename,
      createdBy: input.createdBy,
      provider: 'vimeo',
    })

    if (!asset) throw new Error('asset_create_failed')

    const res = await fetch(`${VIMEO_API}/me/videos`, {
      method: 'POST',
      headers: vimeoHeaders(),
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: input.fileSize,
        },
        name: input.filename,
        privacy: { view: 'disable', embed: 'whitelist' },
      }),
    })

    if (!res.ok) {
      await markVideoAssetFailed(asset.id)
      throw new Error(`vimeo_create_failed: ${await res.text()}`)
    }

    const body = (await res.json()) as {
      uri: string
      link: string
      upload?: { upload_link?: string; approach?: string }
    }

    const videoId = parseVimeoId(body.uri)
    const admin = createAdminClient()
    await admin
      .from('video_assets')
      .update({
        provider: 'vimeo',
        provider_video_id: videoId,
        provider_asset_id: videoId,
        provider_upload_id: body.upload?.upload_link ?? null,
        provider_status: 'uploading',
        provider_processing_status: 'waiting',
        provider_metadata: { uri: body.uri, link: body.link },
        provider_updated_at: new Date().toISOString(),
        storage_provider: 'vimeo',
        bucket_name: 'vimeo',
      })
      .eq('id', asset.id)

    return {
      assetId: asset.id,
      provider: 'vimeo',
      vimeoVideoId: videoId,
      uploadLink: body.upload?.upload_link,
      uploadApproach: 'tus',
    }
  }

  async completeUpload(input: CompleteUploadInput): Promise<VideoAsset | null> {
    const videoId = input.vimeoVideoId
    if (!videoId) return null

    const meta = await this.fetchVimeoVideo(videoId)
    if (!meta) {
      await markVideoAssetFailed(input.assetId)
      return null
    }

    const admin = createAdminClient()
    await admin
      .from('video_assets')
      .update({
        provider_status: meta.status ?? 'ready',
        provider_processing_status: meta.status,
        provider_playback_url: meta.playbackUrl,
        provider_thumbnail_url: meta.thumbnailUrl,
        provider_duration: meta.durationSeconds,
        provider_resolution: meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
        provider_size: meta.fileSize,
        provider_last_sync: new Date().toISOString(),
        provider_updated_at: new Date().toISOString(),
      })
      .eq('id', input.assetId)

    return markVideoAssetReady({
      id: input.assetId,
      fileSize: meta.fileSize,
      durationSeconds: meta.durationSeconds,
      mimeType: input.mimeType ?? 'video/mp4',
    })
  }

  async abortUpload(input: AbortUploadInput): Promise<void> {
    const asset = await getVideoAssetById(input.assetId)
    if (asset?.provider_video_id) {
      await fetch(`${VIMEO_API}/videos/${asset.provider_video_id}`, {
        method: 'DELETE',
        headers: vimeoHeaders(),
      }).catch(() => undefined)
    }
  }

  async deleteVideo(asset: VideoAsset): Promise<void> {
    if (!asset.provider_video_id) return
    await fetch(`${VIMEO_API}/videos/${asset.provider_video_id}`, {
      method: 'DELETE',
      headers: vimeoHeaders(),
    })
  }

  async deleteAssets(asset: VideoAsset): Promise<void> {
    await this.deleteVideo(asset)
  }

  async getVideo(asset: VideoAsset): Promise<ProviderVideoMetadata | null> {
    if (!asset.provider_video_id) return this.getMetadata(asset)
    return this.fetchVimeoVideo(asset.provider_video_id)
  }

  async getMetadata(asset: VideoAsset): Promise<ProviderVideoMetadata | null> {
    return {
      durationSeconds: asset.provider_duration ?? asset.duration_seconds ?? undefined,
      fileSize: asset.provider_size ?? asset.file_size ?? undefined,
      thumbnailUrl: asset.provider_thumbnail_url ?? undefined,
      playbackUrl: asset.provider_playback_url ?? undefined,
      status: asset.provider_status ?? asset.status,
    }
  }

  async getThumbnail(asset: VideoAsset): Promise<string | null> {
    return asset.provider_thumbnail_url ?? null
  }

  async refreshMetadata(asset: VideoAsset): Promise<ProviderVideoMetadata | null> {
    if (!asset.provider_video_id) return this.getMetadata(asset)
    const meta = await this.fetchVimeoVideo(asset.provider_video_id)
    if (!meta) return null

    const admin = createAdminClient()
    await admin
      .from('video_assets')
      .update({
        provider_duration: meta.durationSeconds,
        provider_thumbnail_url: meta.thumbnailUrl,
        provider_playback_url: meta.playbackUrl,
        provider_status: meta.status,
        provider_processing_status: meta.status,
        provider_resolution: meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
        provider_last_sync: new Date().toISOString(),
        duration_seconds: meta.durationSeconds ?? asset.duration_seconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset.id)

    return meta
  }

  async syncStatus(asset: VideoAsset): Promise<VideoAsset | null> {
    await this.refreshMetadata(asset)
    return getVideoAssetById(asset.id)
  }

  async publish(asset: VideoAsset): Promise<VideoAsset | null> {
    if (!asset.provider_video_id) return getVideoAssetById(asset.id)
    await fetch(`${VIMEO_API}/videos/${asset.provider_video_id}`, {
      method: 'PATCH',
      headers: vimeoHeaders(),
      body: JSON.stringify({ privacy: { view: 'disable', embed: 'whitelist' } }),
    })
    return getVideoAssetById(asset.id)
  }

  async unpublish(asset: VideoAsset): Promise<VideoAsset | null> {
    if (!asset.provider_video_id) return getVideoAssetById(asset.id)
    await fetch(`${VIMEO_API}/videos/${asset.provider_video_id}`, {
      method: 'PATCH',
      headers: vimeoHeaders(),
      body: JSON.stringify({ privacy: { view: 'nobody' } }),
    })
    return getVideoAssetById(asset.id)
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackResult | null> {
    const { asset } = input
    if (asset.status !== 'ready' || !asset.provider_video_id) return null

    const playLinks = await this.fetchPlayLinks(asset.provider_video_id)
    if (playLinks?.hlsUrl) {
      return {
        provider: 'vimeo',
        mode: 'hls_proxy',
        hlsUrl: playLinks.hlsUrl,
        url: playLinks.progressiveUrl,
        encrypted: false,
      }
    }
    if (playLinks?.progressiveUrl) {
      return {
        provider: 'vimeo',
        mode: 'signed_mp4',
        url: playLinks.progressiveUrl,
        encrypted: false,
      }
    }

    const embedUrl = `https://player.vimeo.com/video/${asset.provider_video_id}?dnt=1&title=0&byline=0&portrait=0&badge=0&controls=0`
    return {
      provider: 'vimeo',
      mode: 'vimeo_embed',
      embedUrl,
      url: asset.provider_playback_url ?? undefined,
    }
  }

  private async fetchPlayLinks(
    videoId: string
  ): Promise<{ hlsUrl?: string; progressiveUrl?: string } | null> {
    if (!getVimeoToken()) return null
    try {
      const res = await fetch(
        `${VIMEO_API}/videos/${videoId}?fields=play`,
        { headers: vimeoHeaders() }
      )
      if (!res.ok) return null
      const data = (await res.json()) as {
        play?: {
          hls?: { link?: string }
          progressive?: Array<{ link?: string; width?: number }>
        }
      }
      const hlsUrl = data.play?.hls?.link
      const progressive = data.play?.progressive?.sort(
        (a, b) => (b.width ?? 0) - (a.width ?? 0)
      )
      const progressiveUrl = progressive?.[0]?.link
      return { hlsUrl, progressiveUrl }
    } catch {
      return null
    }
  }

  async getAnalytics(asset: VideoAsset): Promise<Record<string, unknown>> {
    if (!asset.provider_video_id) return {}
    const res = await fetch(`${VIMEO_API}/videos/${asset.provider_video_id}`, {
      headers: vimeoHeaders(),
    })
    if (!res.ok) return {}
    return (await res.json()) as Record<string, unknown>
  }

  async estimateCost(asset: VideoAsset): Promise<ProviderCostEstimate> {
    return estimateVimeoCost(asset)
  }

  private async fetchVimeoVideo(videoId: string): Promise<ProviderVideoMetadata | null> {
    const res = await fetch(`${VIMEO_API}/videos/${videoId}`, { headers: vimeoHeaders() })
    if (!res.ok) return null
    const data = (await res.json()) as {
      duration?: number
      width?: number
      height?: number
      status?: string
      link?: string
      pictures?: { sizes?: Array<{ link?: string }> }
    }
    return {
      durationSeconds: data.duration ? Math.round(data.duration) : undefined,
      width: data.width,
      height: data.height,
      thumbnailUrl: data.pictures?.sizes?.[0]?.link,
      playbackUrl: data.link,
      status: data.status,
    }
  }

  supportsHLS(): boolean {
    return true
  }
  supportsEncryption(): boolean {
    return false
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
