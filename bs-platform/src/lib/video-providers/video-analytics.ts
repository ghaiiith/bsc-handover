import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  aggregateCosts,
  estimateR2Cost,
  estimateVimeoCost,
} from '@/lib/video-providers/cost-estimator'
import type { ProviderCostEstimate } from '@/lib/video-providers/types'
import type { VideoAsset } from '@/types'

export interface VideoAnalyticsSummary {
  totalAssets: number
  readyAssets: number
  totalStorageBytes: number
  providerDistribution: Record<string, number>
  monthlyCost: ProviderCostEstimate
  yearlyCost: number
  costPerStudent: number
  costPerView: number
  costPerHourWatched: number
  costPerCourse: number
  costPerInstructor: number
  uploadHistory: Array<{ date: string; count: number }>
  storageGrowth: Array<{ date: string; bytes: number }>
  providerUsage: Array<{ provider: string; assets: number; storageBytes: number; monthlyCostUsd: number }>
  mostViewedVideos: Array<{ assetId: string; courseId: string | null; provider: string; views: number }>
  avgProcessingMinutes: number | null
}

function mapAssetRow(row: Record<string, unknown>): VideoAsset {
  return {
    id: row.id as string,
    storage_provider: row.storage_provider as string,
    bucket_name: row.bucket_name as string,
    object_key: row.object_key as string,
    mime_type: (row.mime_type as string | null) ?? null,
    file_size: (row.file_size as number | null) ?? null,
    duration_seconds: (row.duration_seconds as number | null) ?? null,
    status: row.status as VideoAsset['status'],
    original_filename: (row.original_filename as string | null) ?? null,
    course_id: (row.course_id as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    provider: (row.provider as string | undefined) ?? 'r2',
    provider_size: (row.provider_size as number | null) ?? null,
    provider_duration: (row.provider_duration as number | null) ?? null,
  }
}

function estimateAssetCost(asset: VideoAsset): ProviderCostEstimate {
  return asset.provider === 'vimeo' ? estimateVimeoCost(asset) : estimateR2Cost(asset)
}

export async function getVideoAnalyticsSummary(): Promise<VideoAnalyticsSummary> {
  const admin = createAdminClient()

  const [{ data: assets }, { count: studentCount }, { count: viewCount }, { count: courseCount }, { count: instructorCount }] =
    await Promise.all([
      admin
        .from('video_assets')
        .select(
          'id, storage_provider, bucket_name, object_key, mime_type, file_size, duration_seconds, status, original_filename, course_id, created_by, provider, provider_size, provider_duration, created_at, uploaded_at, provider_last_sync'
        ),
      admin.from('enrollments').select('*', { count: 'exact', head: true }),
      admin.from('lesson_progress').select('*', { count: 'exact', head: true }).eq('completed', true),
      admin.from('courses').select('*', { count: 'exact', head: true }),
      admin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
    ])

  const rows = (assets ?? []).map(mapAssetRow)
  const readyAssets = rows.filter((a) => a.status === 'ready')
  const totalStorageBytes = readyAssets.reduce(
    (sum, a) => sum + (a.provider_size ?? a.file_size ?? 0),
    0
  )

  const providerDistribution: Record<string, number> = {}
  for (const asset of readyAssets) {
    const p = asset.provider ?? 'r2'
    providerDistribution[p] = (providerDistribution[p] ?? 0) + 1
  }

  const costEstimates = readyAssets.map(estimateAssetCost)
  const monthlyCost = aggregateCosts(costEstimates)

  const students = Math.max(studentCount ?? 1, 1)
  const views = Math.max(viewCount ?? 1, 1)
  const courses = Math.max(courseCount ?? 1, 1)
  const instructors = Math.max(instructorCount ?? 1, 1)
  const totalDurationHours =
    readyAssets.reduce(
      (sum, a) => sum + (a.provider_duration ?? a.duration_seconds ?? 0),
      0
    ) / 3600
  const hoursWatched = Math.max(totalDurationHours * 0.3, 1)

  const uploadByDate = new Map<string, number>()
  const storageByDate = new Map<string, number>()

  for (const row of assets ?? []) {
    const dateKey = ((row.uploaded_at ?? row.created_at) as string)?.slice(0, 10)
    if (dateKey) {
      uploadByDate.set(dateKey, (uploadByDate.get(dateKey) ?? 0) + 1)
    }
    if (row.status === 'ready') {
      const size = (row.provider_size ?? row.file_size ?? 0) as number
      if (dateKey) {
        storageByDate.set(dateKey, (storageByDate.get(dateKey) ?? 0) + size)
      }
    }
  }

  const providerUsageMap = new Map<
    string,
    { assets: number; storageBytes: number; monthlyCostUsd: number }
  >()
  for (const asset of readyAssets) {
    const p = asset.provider ?? 'r2'
    const entry = providerUsageMap.get(p) ?? { assets: 0, storageBytes: 0, monthlyCostUsd: 0 }
    const cost = estimateAssetCost(asset)
    entry.assets += 1
    entry.storageBytes += asset.provider_size ?? asset.file_size ?? 0
    entry.monthlyCostUsd += cost.monthlyCostUsd
    providerUsageMap.set(p, entry)
  }

  const uploadHistory = [...uploadByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }))

  let cumulative = 0
  const storageGrowth = [...storageByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, bytes]) => {
      cumulative += bytes
      return { date, bytes: cumulative }
    })

  return {
    totalAssets: rows.length,
    readyAssets: readyAssets.length,
    totalStorageBytes,
    providerDistribution,
    monthlyCost,
    yearlyCost: monthlyCost.yearlyCostUsd,
    costPerStudent: monthlyCost.monthlyCostUsd / students,
    costPerView: monthlyCost.streamingCostUsd / views,
    costPerHourWatched: monthlyCost.streamingCostUsd / hoursWatched,
    costPerCourse: monthlyCost.monthlyCostUsd / courses,
    costPerInstructor: monthlyCost.monthlyCostUsd / instructors,
    uploadHistory,
    storageGrowth,
    providerUsage: [...providerUsageMap.entries()].map(([provider, stats]) => ({
      provider,
      ...stats,
    })),
    mostViewedVideos: [],
    avgProcessingMinutes: null,
  }
}
