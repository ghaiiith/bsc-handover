import { NextResponse } from 'next/server'
import { verifyInstructorCourseAccess } from '@/lib/instructor/verify-course-owner'
import { getVideoAssetById } from '@/lib/video/video-asset-service'
import {
  estimateR2Cost,
  estimateVimeoCost,
} from '@/lib/video-providers/cost-estimator'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params

  const access = await verifyInstructorCourseAccess(courseId)
  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient()
  const { data: lesson } = await admin
    .from('lessons')
    .select('video_asset_id, video_upload_provider')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!lesson?.video_asset_id) {
    return NextResponse.json({ asset: null, uploadProvider: lesson?.video_upload_provider ?? null })
  }

  const asset = await getVideoAssetById(lesson.video_asset_id)
  if (!asset) {
    return NextResponse.json({ asset: null, uploadProvider: lesson.video_upload_provider ?? null })
  }

  const cost =
    asset.provider === 'vimeo' ? estimateVimeoCost(asset) : estimateR2Cost(asset)

  return NextResponse.json({
    asset: {
      id: asset.id,
      provider: asset.provider ?? 'r2',
      providerVideoId: asset.provider_video_id,
      status: asset.status,
      providerStatus: asset.provider_status,
      providerProcessingStatus: asset.provider_processing_status,
      providerHealth: asset.provider_health,
      durationSeconds: asset.provider_duration ?? asset.duration_seconds,
      resolution: asset.provider_resolution,
      fileSize: asset.provider_size ?? asset.file_size,
      thumbnailUrl: asset.provider_thumbnail_url,
      uploadedAt: asset.uploaded_at ?? asset.created_at,
      lastSync: asset.provider_last_sync,
      metadata: asset.provider_metadata,
      privacy: (asset.provider_metadata as Record<string, unknown> | null)?.privacy ?? null,
    },
    cost,
    uploadProvider: lesson.video_upload_provider ?? null,
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params

  const access = await verifyInstructorCourseAccess(courseId)
  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { uploadProvider?: 'vimeo' | 'r2' | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (
    body.uploadProvider != null &&
    body.uploadProvider !== 'vimeo' &&
    body.uploadProvider !== 'r2'
  ) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 })
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient()
  const { error } = await admin
    .from('lessons')
    .update({ video_upload_provider: body.uploadProvider ?? null })
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, uploadProvider: body.uploadProvider ?? null })
}
