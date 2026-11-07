import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateLessonAssetHealth } from '@/lib/video/asset-health'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import type { StudioProtectionStatus } from '@/types/content-protection'

export const runtime = 'nodejs'

async function fetchProtectionStatus(
  courseId: string,
  lessonId: string
): Promise<StudioProtectionStatus | null> {
  const admin = createAdminClient()

  const [{ data: protection }, { data: keyRow }] = await Promise.all([
    admin
      .from('lesson_content_protection')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle(),
    admin
      .from('lesson_encryption_keys')
      .select('encryption_version, processing_version')
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle(),
  ])

  return {
    lessonId,
    courseId,
    encryptionStatus: (protection?.encryption_status as StudioProtectionStatus['encryptionStatus']) ?? 'none',
    protectionStatus: (protection?.protection_status as StudioProtectionStatus['protectionStatus']) ?? 'standard',
    assetHealth: (protection?.asset_health as StudioProtectionStatus['assetHealth']) ?? 'unknown',
    assetHealthDetails: (protection?.asset_health_details as StudioProtectionStatus['assetHealthDetails']) ?? null,
    lastValidationAt: (protection?.last_validation_at as string | null) ?? null,
    keyRegistered: Boolean(keyRow),
    encryptionVersion: (keyRow?.encryption_version as number) ?? 0,
    processingVersion: (keyRow?.processing_version as number) ?? 0,
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const admin = await verifyStudioAdmin(_request)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { courseId, lessonId } = await context.params
  const status = await fetchProtectionStatus(courseId, lessonId)
  if (!status) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(status)
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const admin = await verifyStudioAdmin(_request)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { courseId, lessonId } = await context.params
  const report = await validateLessonAssetHealth(courseId, lessonId)
  const status = await fetchProtectionStatus(courseId, lessonId)

  return NextResponse.json({
    ...status,
    assetHealth: report.overall,
    assetHealthDetails: report,
    lastValidationAt: report.checkedAt,
  })
}
