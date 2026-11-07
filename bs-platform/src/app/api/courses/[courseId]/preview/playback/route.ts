import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePlaybackProtectionCapabilities } from '@/lib/video/playback-protection-capabilities'
import { getVideoAssetById } from '@/lib/video/video-asset-service'
import {
  getVideoProviderForAsset,
  resolveAssetProviderId,
} from '@/lib/video-providers/provider-factory'
import type { SecurePlaybackResponse } from '@/types/content-protection'

export const runtime = 'nodejs'

const PREVIEW_TTL_SECONDS = 60 * 60 * 2

/**
 * Course preview trailer. Intentionally public (marketing), but still served
 * via a short-lived signed URL — the object is never public.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params
  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select('preview_video_asset_id, status')
    .eq('id', courseId)
    .maybeSingle()

  if (!course?.preview_video_asset_id) {
    return NextResponse.json({ status: 'none' satisfies SecurePlaybackResponse['status'] })
  }

  const asset = await getVideoAssetById(course.preview_video_asset_id as string)
  if (!asset) {
    return NextResponse.json({ status: 'none' })
  }

  if (asset.status !== 'ready') {
    return NextResponse.json({ status: asset.status })
  }

  const provider = await getVideoProviderForAsset(asset)
  const playback = await provider.getPlayback({
    asset,
    courseId,
    ttlSeconds: PREVIEW_TTL_SECONDS,
  })

  if (!playback) {
    return NextResponse.json({ status: 'failed' })
  }

  const providerId = resolveAssetProviderId(asset)

  const body: SecurePlaybackResponse = {
    status: 'ready',
    playbackMode: playback.mode,
    url: playback.url,
    hlsUrl: playback.hlsUrl,
    embedUrl: playback.embedUrl,
    encrypted: playback.encrypted,
    expiresAt: new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000).toISOString(),
    playbackProtection: resolvePlaybackProtectionCapabilities({
      encrypted: playback.encrypted ?? false,
      hlsUrl: playback.hlsUrl,
      url: playback.url,
      hasSession: false,
    }),
  }

  if (process.env.NODE_ENV === 'development') {
    body.provider = providerId
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
