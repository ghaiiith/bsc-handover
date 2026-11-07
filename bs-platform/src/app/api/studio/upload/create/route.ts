import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MAX_VIDEO_SIZE_MB } from '@/lib/constants'
import {
  isSourceVideoKey,
  validateStudioObjectKey,
} from '@/lib/studio/object-key-validation'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { getStorageProvider, isStorageConfigured } from '@/lib/storage/provider'
import { createPendingVideoAsset } from '@/lib/video/video-asset-service'

export const runtime = 'nodejs'

const MAX_PARTS = 10000
const MAX_ASSET_MB = MAX_VIDEO_SIZE_MB

const bodySchema = z.object({
  courseId: z.string().uuid(),
  objectKey: z.string().min(1).max(512),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  partCount: z.number().int().min(1).max(MAX_PARTS),
})

function extractErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const withCode = err as { code?: string; errors?: Array<{ code?: string }> }
    return withCode.code ?? withCode.errors?.[0]?.code
  }
  return undefined
}

/** Phase 2 studio multipart init — same protocol as Phase 1, arbitrary asset keys. */
export async function POST(request: Request) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const keyError = validateStudioObjectKey(parsed.courseId, parsed.objectKey)
  if (keyError) {
    return NextResponse.json({ error: keyError }, { status: 400 })
  }

  if (parsed.fileSize > MAX_ASSET_MB * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  let assetId: string | undefined
  if (isSourceVideoKey(parsed.objectKey)) {
    const asset = await createPendingVideoAsset({
      courseId: parsed.courseId,
      objectKey: parsed.objectKey,
      mimeType: parsed.contentType,
      originalFilename: parsed.filename,
      createdBy: admin.userId,
      provider: 'r2',
    })
    if (!asset) {
      return NextResponse.json({ error: 'asset_create_failed' }, { status: 500 })
    }
    assetId = asset.id
  }

  try {
    const provider = getStorageProvider()
    const multipart = await provider.createMultipartUpload({
      key: parsed.objectKey,
      contentType: parsed.contentType,
      partCount: parsed.partCount,
    })

    return NextResponse.json({
      assetId,
      key: multipart.key,
      uploadId: multipart.uploadId,
      parts: multipart.parts,
    })
  } catch (err) {
    console.error('[studio/upload/create] failed:', err)
    const code = extractErrorCode(err)
    const unreachable =
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'EAI_AGAIN'
    return NextResponse.json(
      { error: unreachable ? 'storage_unreachable' : 'upload_init_failed' },
      { status: unreachable ? 504 : 502 }
    )
  }
}
