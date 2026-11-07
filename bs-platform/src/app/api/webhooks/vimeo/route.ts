import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVideoAssetById, markVideoAssetReady } from '@/lib/video/video-asset-service'
import { VimeoVideoProvider } from '@/lib/video-providers/providers/vimeo-provider'

export const runtime = 'nodejs'

/** Vimeo webhook — sync video status after processing. */
export async function POST(request: Request) {
  const secret = process.env.VIMEO_WEBHOOK_SECRET
  // Fail closed: an unauthenticated state-mutating webhook is not acceptable.
  if (!secret) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
  }

  const rawBody = await request.text()

  // Vimeo signs `${timestamp}.${body}` with HMAC-SHA256; the header is
  // `X-Vimeo-Signature: t=<ts>,v1=<hex>`. Verify constant-time, fail closed.
  const sigHeader = request.headers.get('x-vimeo-signature') ?? ''
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=')
      return [k?.trim(), v?.trim()]
    })
  )
  const provided = parts.v1 ?? sigHeader.replace(/^sha256=/i, '').trim()
  const signedPayload = parts.t ? `${parts.t}.${rawBody}` : rawBody
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
  const a = Buffer.from(String(provided).toLowerCase(), 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let body: {
    video_uri?: string
    status?: string
    metadata?: { connections?: { pictures?: unknown } }
  }

  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const uri = body.video_uri
  if (!uri) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const videoId = uri.split('/').pop()
  if (!videoId) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const admin = createAdminClient()
  const { data: assetRow } = await admin
    .from('video_assets')
    .select('id')
    .eq('provider_video_id', videoId)
    .maybeSingle()

  if (!assetRow) {
    return NextResponse.json({ ok: true, not_found: true })
  }

  const asset = await getVideoAssetById(assetRow.id as string)
  if (!asset) {
    return NextResponse.json({ ok: true })
  }

  const vimeo = new VimeoVideoProvider()
  await vimeo.initialize()
  const meta = await vimeo.refreshMetadata(asset)

  if (meta?.status === 'available' || meta?.status === 'ready') {
    await markVideoAssetReady({
      id: asset.id,
      durationSeconds: meta.durationSeconds,
      fileSize: meta.fileSize,
    })
  }

  return NextResponse.json({ ok: true, assetId: asset.id })
}
