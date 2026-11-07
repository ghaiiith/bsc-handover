import type { VideoAsset } from '@/types'
import type { ProviderCostEstimate } from '@/lib/video-providers/types'

const R2_STORAGE_GB_MONTH = 0.015
const R2_EGRESS_GB = 0.0
const VIMEO_STORAGE_GB_MONTH = 0.04
const VIMEO_STREAM_HOUR = 0.005

export function estimateR2Cost(asset: VideoAsset): ProviderCostEstimate {
  const sizeGb = (asset.file_size ?? 0) / (1024 * 1024 * 1024)
  const durationHours = (asset.duration_seconds ?? 0) / 3600
  const storageCostUsd = sizeGb * R2_STORAGE_GB_MONTH
  const streamingCostUsd = sizeGb * 2 * R2_EGRESS_GB
  const monthlyCostUsd = storageCostUsd + streamingCostUsd

  return {
    storageCostUsd,
    uploadCostUsd: 0,
    streamingCostUsd,
    processingCostUsd: 0,
    apiCostUsd: 0,
    monthlyCostUsd,
    yearlyCostUsd: monthlyCostUsd * 12,
  }
}

export function estimateVimeoCost(asset: VideoAsset): ProviderCostEstimate {
  const sizeGb = ((asset.provider_size ?? asset.file_size) ?? 0) / (1024 * 1024 * 1024)
  const durationHours = ((asset.provider_duration ?? asset.duration_seconds) ?? 0) / 3600
  const storageCostUsd = sizeGb * VIMEO_STORAGE_GB_MONTH
  const streamingCostUsd = durationHours * 10 * VIMEO_STREAM_HOUR
  const monthlyCostUsd = storageCostUsd + streamingCostUsd

  return {
    storageCostUsd,
    uploadCostUsd: 0,
    streamingCostUsd,
    processingCostUsd: 0,
    apiCostUsd: 0.001,
    monthlyCostUsd,
    yearlyCostUsd: monthlyCostUsd * 12,
  }
}

export function aggregateCosts(estimates: ProviderCostEstimate[]): ProviderCostEstimate {
  return estimates.reduce(
    (acc, e) => ({
      storageCostUsd: acc.storageCostUsd + e.storageCostUsd,
      uploadCostUsd: acc.uploadCostUsd + e.uploadCostUsd,
      streamingCostUsd: acc.streamingCostUsd + e.streamingCostUsd,
      processingCostUsd: acc.processingCostUsd + e.processingCostUsd,
      apiCostUsd: acc.apiCostUsd + e.apiCostUsd,
      monthlyCostUsd: acc.monthlyCostUsd + e.monthlyCostUsd,
      yearlyCostUsd: acc.yearlyCostUsd + e.yearlyCostUsd,
    }),
    {
      storageCostUsd: 0,
      uploadCostUsd: 0,
      streamingCostUsd: 0,
      processingCostUsd: 0,
      apiCostUsd: 0,
      monthlyCostUsd: 0,
      yearlyCostUsd: 0,
    }
  )
}
