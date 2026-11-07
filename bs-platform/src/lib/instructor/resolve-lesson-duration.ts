import 'server-only'

import { getVideoAssetById } from '@/lib/video/video-asset-service'

/** Ensures lesson duration is at least 1 minute, preferring video asset metadata. */
export async function resolveLessonDurationMinutes(
  videoAssetId: string | null | undefined,
  requestedMinutes: number
): Promise<number> {
  const normalized = Number.isFinite(requestedMinutes)
    ? Math.max(0, Math.round(requestedMinutes))
    : 0

  if (normalized >= 1) return normalized

  if (videoAssetId) {
    const asset = await getVideoAssetById(videoAssetId)
    const seconds = asset?.provider_duration ?? asset?.duration_seconds
    if (seconds && seconds > 0) {
      return Math.max(1, Math.ceil(seconds / 60))
    }
  }

  return 1
}
