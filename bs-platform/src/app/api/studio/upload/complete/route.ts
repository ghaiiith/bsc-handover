import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { getStorageProvider } from '@/lib/storage/provider'
import {
  getVideoAssetById,
  markVideoAssetFailed,
  markVideoAssetReady,
} from '@/lib/video/video-asset-service'

export const runtime = 'nodejs'

const bodySchema = z.object({
  objectKey: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        etag: z.string().min(1),
      })
    )
    .min(1),
  assetId: z.string().uuid().optional(),
  fileSize: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
})

export async function POST(request: Request) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const provider = getStorageProvider()

  try {
    await provider.completeMultipartUpload({
      key: parsed.objectKey,
      uploadId: parsed.uploadId,
      parts: parsed.parts,
    })
  } catch (err) {
    console.error('[studio/upload/complete] failed:', err)
    if (parsed.assetId) {
      await markVideoAssetFailed(parsed.assetId)
    }
    return NextResponse.json({ error: 'upload_complete_failed' }, { status: 502 })
  }

  let asset = parsed.assetId ? await getVideoAssetById(parsed.assetId) : null
  if (asset) {
    const head = await provider.headObject(parsed.objectKey)
    asset =
      (await markVideoAssetReady({
        id: asset.id,
        fileSize: parsed.fileSize ?? head?.size ?? null,
        durationSeconds: parsed.durationSeconds ?? null,
        mimeType: parsed.mimeType ?? head?.contentType ?? asset.mime_type ?? null,
      })) ?? asset
  }

  return NextResponse.json({
    ok: true,
    assetId: asset?.id,
    status: asset?.status ?? 'uploaded',
    fileSize: asset?.file_size ?? parsed.fileSize,
  })
}
