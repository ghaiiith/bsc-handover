import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  aggregateCosts,
  estimateR2Cost,
  estimateVimeoCost,
} from '@/lib/video-providers/cost-estimator'
import type { VideoAsset } from '@/types'

export interface CourseVideoSummary {
  primaryProvider: string | null
  videoStatus: string
  health: string
  processing: string
  durationSeconds: number
  resolution: string | null
  storageBytes: number
  estimatedMonthlyCostUsd: number
  lessonCount: number
  readyCount: number
}

function mapMiniAsset(row: Record<string, unknown>): VideoAsset {
  return {
    id: row.id as string,
    storage_provider: row.storage_provider as string,
    bucket_name: row.bucket_name as string,
    object_key: row.object_key as string,
    mime_type: null,
    file_size: (row.file_size as number | null) ?? null,
    duration_seconds: (row.duration_seconds as number | null) ?? null,
    status: row.status as VideoAsset['status'],
    original_filename: null,
    course_id: (row.course_id as string | null) ?? null,
    created_by: null,
    provider: (row.provider as string | undefined) ?? 'r2',
    provider_size: (row.provider_size as number | null) ?? null,
    provider_duration: (row.provider_duration as number | null) ?? null,
    provider_resolution: (row.provider_resolution as string | null) ?? null,
    provider_health: (row.provider_health as string | null) ?? null,
    provider_processing_status: (row.provider_processing_status as string | null) ?? null,
    provider_status: (row.provider_status as string | null) ?? null,
  }
}

function summarizeAssets(assets: VideoAsset[]): CourseVideoSummary {
  if (assets.length === 0) {
    return {
      primaryProvider: null,
      videoStatus: 'none',
      health: 'unknown',
      processing: 'none',
      durationSeconds: 0,
      resolution: null,
      storageBytes: 0,
      estimatedMonthlyCostUsd: 0,
      lessonCount: 0,
      readyCount: 0,
    }
  }

  const providerCounts = new Map<string, number>()
  let durationSeconds = 0
  let storageBytes = 0
  let readyCount = 0
  let resolution: string | null = null
  const statuses = new Set<string>()
  const healths = new Set<string>()
  const processing = new Set<string>()
  const costs = []

  for (const asset of assets) {
    const provider = asset.provider ?? 'r2'
    providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1)
    durationSeconds += asset.provider_duration ?? asset.duration_seconds ?? 0
    storageBytes += asset.provider_size ?? asset.file_size ?? 0
    statuses.add(asset.status)
    if (asset.status === 'ready') readyCount += 1
    if (asset.provider_health) healths.add(asset.provider_health)
    if (asset.provider_processing_status) processing.add(asset.provider_processing_status)
    if (asset.provider_resolution && !resolution) resolution = asset.provider_resolution
    costs.push(asset.provider === 'vimeo' ? estimateVimeoCost(asset) : estimateR2Cost(asset))
  }

  const primaryProvider =
    [...providerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const videoStatus = statuses.has('uploading')
    ? 'uploading'
    : statuses.has('failed')
      ? 'failed'
      : readyCount === assets.length
        ? 'ready'
        : readyCount > 0
          ? 'partial'
          : 'pending'

  const health = healths.has('degraded')
    ? 'degraded'
    : healths.has('warning')
      ? 'warning'
      : healths.has('offline')
        ? 'offline'
        : healths.has('healthy')
          ? 'healthy'
          : 'unknown'

  const processingStatus = processing.has('processing')
    ? 'processing'
    : processing.has('failed')
      ? 'failed'
      : readyCount === assets.length
        ? 'complete'
        : 'pending'

  const monthlyCost = aggregateCosts(costs)

  return {
    primaryProvider,
    videoStatus,
    health,
    processing: processingStatus,
    durationSeconds,
    resolution,
    storageBytes,
    estimatedMonthlyCostUsd: monthlyCost.monthlyCostUsd,
    lessonCount: assets.length,
    readyCount,
  }
}

export async function getCourseVideoSummaries(
  courseIds: string[]
): Promise<Map<string, CourseVideoSummary>> {
  const result = new Map<string, CourseVideoSummary>()
  if (courseIds.length === 0) return result

  const admin = createAdminClient()
  const { data: lessons } = await admin
    .from('lessons')
    .select(
      `
      course_id,
      video_asset_id,
      video_assets:video_asset_id (
        id, storage_provider, bucket_name, object_key, file_size, duration_seconds,
        status, provider, provider_size, provider_duration, provider_resolution,
        provider_health, provider_processing_status, provider_status, course_id
      )
    `
    )
    .in('course_id', courseIds)
    .not('video_asset_id', 'is', null)

  const byCourse = new Map<string, VideoAsset[]>()

  for (const lesson of lessons ?? []) {
    const courseId = lesson.course_id as string
    const assetJoined = lesson.video_assets as unknown
    if (!assetJoined || Array.isArray(assetJoined)) continue
    const asset = mapMiniAsset(assetJoined as Record<string, unknown>)
    const list = byCourse.get(courseId) ?? []
    list.push(asset)
    byCourse.set(courseId, list)
  }

  for (const courseId of courseIds) {
    result.set(courseId, summarizeAssets(byCourse.get(courseId) ?? []))
  }

  return result
}
