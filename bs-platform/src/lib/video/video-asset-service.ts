import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getStorageProvider } from '@/lib/storage/provider'
import {
  getVideoProviderForAsset,
  resolveAssetProviderId,
} from '@/lib/video-providers/provider-factory'
import type { VideoProviderId } from '@/lib/video-providers/types'
import type { VideoAsset, VideoAssetStatus } from '@/types'

const ASSET_COLUMNS =
  'id, storage_provider, bucket_name, object_key, mime_type, file_size, duration_seconds, status, original_filename, course_id, created_by, created_at, updated_at, uploaded_at, provider, provider_asset_id, provider_video_id, provider_upload_id, provider_status, provider_processing_status, provider_playback_url, provider_thumbnail_url, provider_duration, provider_resolution, provider_size, provider_metadata, provider_capabilities, provider_cost, provider_last_sync, provider_health, provider_error, provider_created_at, provider_updated_at, provider_version, provider_settings'

function mapAsset(row: Record<string, unknown>): VideoAsset {
  return {
    id: row.id as string,
    storage_provider: row.storage_provider as string,
    bucket_name: row.bucket_name as string,
    object_key: row.object_key as string,
    mime_type: (row.mime_type as string | null) ?? null,
    file_size: (row.file_size as number | null) ?? null,
    duration_seconds: (row.duration_seconds as number | null) ?? null,
    status: row.status as VideoAssetStatus,
    original_filename: (row.original_filename as string | null) ?? null,
    course_id: (row.course_id as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
    uploaded_at: (row.uploaded_at as string | null) ?? null,
    provider: (row.provider as string | undefined) ?? 'r2',
    provider_asset_id: (row.provider_asset_id as string | null) ?? null,
    provider_video_id: (row.provider_video_id as string | null) ?? null,
    provider_upload_id: (row.provider_upload_id as string | null) ?? null,
    provider_status: (row.provider_status as string | null) ?? null,
    provider_processing_status: (row.provider_processing_status as string | null) ?? null,
    provider_playback_url: (row.provider_playback_url as string | null) ?? null,
    provider_thumbnail_url: (row.provider_thumbnail_url as string | null) ?? null,
    provider_duration: (row.provider_duration as number | null) ?? null,
    provider_resolution: (row.provider_resolution as string | null) ?? null,
    provider_size: (row.provider_size as number | null) ?? null,
    provider_metadata: (row.provider_metadata as Record<string, unknown> | null) ?? null,
    provider_capabilities: (row.provider_capabilities as Record<string, unknown> | null) ?? null,
    provider_cost: (row.provider_cost as Record<string, unknown> | null) ?? null,
    provider_last_sync: (row.provider_last_sync as string | null) ?? null,
    provider_health: (row.provider_health as string | null) ?? null,
    provider_error: (row.provider_error as string | null) ?? null,
    provider_created_at: (row.provider_created_at as string | null) ?? null,
    provider_updated_at: (row.provider_updated_at as string | null) ?? null,
    provider_version: (row.provider_version as number | undefined) ?? 1,
    provider_settings: (row.provider_settings as Record<string, unknown> | null) ?? null,
  }
}

export async function getVideoAssetById(id: string): Promise<VideoAsset | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('video_assets')
    .select(ASSET_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return mapAsset(data)
}

export interface CreatePendingAssetInput {
  courseId: string
  objectKey: string
  mimeType: string
  originalFilename?: string | null
  createdBy: string
  provider?: VideoProviderId
}

/**
 * Creates a video_asset row in `uploading` state. If a row already exists for
 * the same (bucket, object_key) — e.g. replacing a lesson's video — it is
 * reset and reused so the object key stays stable.
 */
export async function createPendingVideoAsset(
  input: CreatePendingAssetInput
): Promise<VideoAsset | null> {
  const admin = createAdminClient()
  const providerId = input.provider ?? 'r2'
  const storage = getStorageProvider()

  const bucketName =
    providerId === 'vimeo' ? 'vimeo' : storage.bucketName
  const storageProvider =
    providerId === 'vimeo' ? 'vimeo' : storage.providerId

  const { data, error } = await admin
    .from('video_assets')
    .upsert(
      {
        storage_provider: storageProvider,
        bucket_name: bucketName,
        object_key: input.objectKey,
        mime_type: input.mimeType,
        original_filename: input.originalFilename ?? null,
        course_id: input.courseId,
        created_by: input.createdBy,
        status: 'uploading' as VideoAssetStatus,
        file_size: null,
        duration_seconds: null,
        uploaded_at: null,
        updated_at: new Date().toISOString(),
        provider: providerId,
        provider_status: 'uploading',
        provider_created_at: new Date().toISOString(),
        provider_updated_at: new Date().toISOString(),
      },
      { onConflict: 'bucket_name,object_key' }
    )
    .select(ASSET_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[video-asset] create failed:', error?.message)
    return null
  }
  return mapAsset(data)
}

export interface MarkReadyInput {
  id: string
  fileSize?: number | null
  durationSeconds?: number | null
  mimeType?: string | null
}

export async function markVideoAssetReady(
  input: MarkReadyInput
): Promise<VideoAsset | null> {
  const admin = createAdminClient()
  const updates: Record<string, unknown> = {
    status: 'ready' as VideoAssetStatus,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    provider_status: 'ready',
    provider_updated_at: new Date().toISOString(),
  }
  if (input.fileSize != null) updates.file_size = input.fileSize
  if (input.durationSeconds != null) {
    updates.duration_seconds = input.durationSeconds
    updates.provider_duration = input.durationSeconds
  }
  if (input.mimeType) updates.mime_type = input.mimeType

  const { data, error } = await admin
    .from('video_assets')
    .update(updates)
    .eq('id', input.id)
    .select(ASSET_COLUMNS)
    .single()

  if (error || !data) return null
  return mapAsset(data)
}

export async function markVideoAssetFailed(id: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('video_assets')
    .update({
      status: 'failed' as VideoAssetStatus,
      provider_status: 'failed',
      updated_at: new Date().toISOString(),
      provider_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

/** Deletes provider assets then the metadata row. Best-effort on storage. */
export async function deleteVideoAsset(id: string): Promise<void> {
  const admin = createAdminClient()
  const asset = await getVideoAssetById(id)
  if (asset) {
    try {
      const provider = await getVideoProviderForAsset(asset)
      await provider.deleteAssets(asset)
    } catch (err) {
      console.error('[video-asset] provider delete failed:', err)
      if (resolveAssetProviderId(asset) === 'r2') {
        try {
          await getStorageProvider().deleteObject(asset.object_key)
        } catch (storageErr) {
          console.error('[video-asset] object delete failed:', storageErr)
        }
      }
    }
  }
  await admin.from('video_assets').delete().eq('id', id)
}

/** Short-lived signed playback URL for a ready R2 asset, or null. */
export async function getVideoAssetSignedUrl(
  asset: VideoAsset,
  ttlSeconds?: number
): Promise<string | null> {
  if (asset.status !== 'ready') return null
  if (resolveAssetProviderId(asset) !== 'r2') {
    return asset.provider_playback_url ?? null
  }
  try {
    return await getStorageProvider().getSignedDownloadUrl({
      key: asset.object_key,
      ttlSeconds,
    })
  } catch (err) {
    console.error('[video-asset] sign url failed:', err)
    return null
  }
}
