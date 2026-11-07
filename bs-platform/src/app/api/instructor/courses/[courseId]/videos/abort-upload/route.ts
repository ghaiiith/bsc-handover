import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyInstructorCourseAccess } from '@/lib/instructor/verify-course-owner'
import { getStorageProvider } from '@/lib/storage/provider'
import { deleteVideoAsset, getVideoAssetById } from '@/lib/video/video-asset-service'

export const runtime = 'nodejs'

const bodySchema = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1).optional(),
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

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const asset = await getVideoAssetById(parsed.assetId)
  if (!asset || asset.course_id !== courseId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (parsed.uploadId) {
    try {
      await getStorageProvider().abortMultipartUpload({
        key: asset.object_key,
        uploadId: parsed.uploadId,
      })
    } catch (err) {
      console.error('[videos/abort-upload] abort failed:', err)
    }
  }

  await deleteVideoAsset(asset.id)

  return NextResponse.json({ ok: true })
}
