import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { getStorageProvider } from '@/lib/storage/provider'
import { deleteVideoAsset, getVideoAssetById } from '@/lib/video/video-asset-service'

export const runtime = 'nodejs'

const bodySchema = z.object({
  objectKey: z.string().min(1),
  uploadId: z.string().min(1).optional(),
  assetId: z.string().uuid().optional(),
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

  if (parsed.uploadId) {
    try {
      await getStorageProvider().abortMultipartUpload({
        key: parsed.objectKey,
        uploadId: parsed.uploadId,
      })
    } catch (err) {
      console.error('[studio/upload/abort] abort failed:', err)
    }
  }

  if (parsed.assetId) {
    const asset = await getVideoAssetById(parsed.assetId)
    if (asset) {
      await deleteVideoAsset(asset.id)
    }
  }

  return NextResponse.json({ ok: true })
}
