import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyInstructorCourseAccess } from '@/lib/instructor/verify-course-owner'
import { getStorageProvider } from '@/lib/storage/provider'
import { getVideoAssetById } from '@/lib/video/video-asset-service'
import {
  getVideoProviderForAsset,
  resolveAssetProviderId,
} from '@/lib/video-providers/provider-factory'

export const runtime = 'nodejs'

const r2BodySchema = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        etag: z.string().min(1),
      })
    )
    .min(1),
  durationSeconds: z.number().int().positive().optional(),
})

const vimeoBodySchema = z.object({
  assetId: z.string().uuid(),
  vimeoVideoId: z.string().min(1),
  durationSeconds: z.number().int().positive().optional(),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params

  const access = await verifyInstructorCourseAccess(courseId)
  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const assetId = raw?.assetId as string | undefined
  if (!assetId) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const asset = await getVideoAssetById(assetId)
  if (!asset || asset.course_id !== courseId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const providerId = resolveAssetProviderId(asset)
  const provider = await getVideoProviderForAsset(asset)

  try {
    if (providerId === 'vimeo') {
      const parsed = vimeoBodySchema.parse(raw)
      const ready = await provider.completeUpload({
        assetId: parsed.assetId,
        courseId,
        vimeoVideoId: parsed.vimeoVideoId,
        durationSeconds: parsed.durationSeconds,
        mimeType: 'video/mp4',
      })
      if (!ready) {
        return NextResponse.json({ error: 'asset_update_failed' }, { status: 500 })
      }
      return NextResponse.json({
        assetId: ready.id,
        status: ready.status,
        provider: 'vimeo',
        durationSeconds: ready.duration_seconds,
      })
    }

    const parsed = r2BodySchema.parse(raw)
    const head = await getStorageProvider().headObject(asset.object_key)
    const ready = await provider.completeUpload({
      assetId: parsed.assetId,
      courseId,
      objectKey: asset.object_key,
      uploadId: parsed.uploadId,
      parts: parsed.parts,
      fileSize: head?.size,
      durationSeconds: parsed.durationSeconds,
      mimeType: head?.contentType ?? asset.mime_type ?? undefined,
    })

    if (!ready) {
      return NextResponse.json({ error: 'upload_complete_failed' }, { status: 502 })
    }

    return NextResponse.json({
      assetId: ready.id,
      status: ready.status,
      provider: 'r2',
      fileSize: ready.file_size,
      durationSeconds: ready.duration_seconds,
    })
  } catch (err) {
    console.error('[videos/complete-upload] failed:', err)
    return NextResponse.json({ error: 'upload_complete_failed' }, { status: 502 })
  }
}
