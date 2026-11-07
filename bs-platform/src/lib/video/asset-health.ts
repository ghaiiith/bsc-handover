import 'server-only'

import { getStorageProvider } from '@/lib/storage/provider'
import {
  hlsMasterKey,
  hlsObjectKey,
  hlsPrefix,
  metadataPrefix,
  thumbnailsPrefix,
} from '@/lib/storage/object-keys'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLessonEncrypted } from '@/lib/video/encryption-keys'
import type {
  AssetHealthReport,
  AssetHealthStatus,
  HealthCheckResult,
} from '@/types/content-protection'

async function headKey(key: string): Promise<boolean> {
  const head = await getStorageProvider().headObject(key)
  return head != null
}

function mergeStatus(current: AssetHealthStatus, next: HealthCheckResult): AssetHealthStatus {
  if (next.status === 'error') return 'critical'
  if (next.status === 'warning' && current !== 'critical') return 'degraded'
  return current
}

/** Validates R2 assets for a lesson slot without modifying storage. */
export async function validateLessonAssetHealth(
  courseId: string,
  lessonId: string
): Promise<AssetHealthReport> {
  const issues: string[] = []
  let overall: AssetHealthStatus = 'healthy'

  const masterKey = hlsMasterKey(courseId, lessonId)
  const masterOk = await headKey(masterKey)
  const masterPlaylist: HealthCheckResult = masterOk
    ? { status: 'ok' }
    : { status: 'error', message: 'master.m3u8 missing' }
  if (!masterOk) {
    issues.push('Missing HLS master playlist')
    overall = 'critical'
  }

  const variantNames = ['1080', '720', '480', '360']
  const variants: HealthCheckResult[] = []

  for (const name of variantNames) {
    const playlistKey = hlsObjectKey(courseId, lessonId, `${name}/playlist.m3u8`)
    const ok = await headKey(playlistKey)
    if (ok) {
      variants.push({ status: 'ok', message: name })
    } else if (masterOk) {
      variants.push({ status: 'skipped', message: name })
    }
  }

  const encrypted = await isLessonEncrypted(courseId, lessonId)
  const encryption: HealthCheckResult = encrypted
    ? { status: 'ok', message: 'AES-128 key registered' }
    : masterOk
      ? { status: 'warning', message: 'HLS present but no encryption key' }
      : { status: 'skipped' }

  if (encryption.status === 'warning') {
    issues.push('Unencrypted HLS or missing key registration')
    overall = mergeStatus(overall, encryption)
  }

  const metaKey = `${metadataPrefix(courseId, lessonId)}processing.json`
  const metaOk = await headKey(metaKey)
  const metadata: HealthCheckResult = metaOk
    ? { status: 'ok' }
    : { status: 'warning', message: 'processing.json missing' }
  if (!metaOk) {
    issues.push('Missing processing metadata')
    overall = mergeStatus(overall, metadata)
  }

  const posterKey = `${thumbnailsPrefix(courseId, lessonId)}poster.jpg`
  const thumbOk = await headKey(posterKey)
  const thumbnails: HealthCheckResult = thumbOk
    ? { status: 'ok' }
    : { status: 'warning', message: 'poster.jpg missing' }
  if (!thumbOk) {
    issues.push('Missing poster thumbnail')
    overall = mergeStatus(overall, thumbnails)
  }

  if (overall === 'healthy' && issues.length > 0) {
    overall = 'degraded'
  }

  const report: AssetHealthReport = {
    overall,
    checkedAt: new Date().toISOString(),
    masterPlaylist,
    variants,
    encryption,
    metadata,
    thumbnails,
    issues,
  }

  const admin = createAdminClient()
  await admin.from('lesson_content_protection').upsert(
    {
      lesson_id: lessonId,
      course_id: courseId,
      asset_health: overall,
      asset_health_details: report,
      last_validation_at: report.checkedAt,
      last_validation_version: 1,
      updated_at: report.checkedAt,
    },
    { onConflict: 'lesson_id' }
  )

  return report
}

export async function listHlsPrefixKeys(
  courseId: string,
  lessonId: string
): Promise<string[]> {
  void hlsPrefix(courseId, lessonId)
  return []
}
