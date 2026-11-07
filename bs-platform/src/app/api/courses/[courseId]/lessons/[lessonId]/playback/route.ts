import { NextResponse } from 'next/server'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'
import {
  buildSessionCookie,
  createPlaybackSession,
  getRenewBeforeSeconds,
  getSessionTtlSeconds,
} from '@/lib/video/playback-session'
import { resolvePlaybackProtectionCapabilities } from '@/lib/video/playback-protection-capabilities'
import { extractClientMeta, logVideoSecurityEvent } from '@/lib/video/security-log'
import { buildWatermarkConfig } from '@/lib/video/watermark-config'
import { getVideoAssetById } from '@/lib/video/video-asset-service'
import {
  getVideoProviderForAsset,
  resolveAssetProviderId,
} from '@/lib/video-providers/provider-factory'
import type { SecurePlaybackResponse } from '@/types/content-protection'

export const runtime = 'nodejs'

const PLAYBACK_TTL_SECONDS = 60 * 60 * 6

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const clientMeta = extractClientMeta(request)

  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!access.allowed) {
    await logVideoSecurityEvent({
      eventType: 'unauthorized_request',
      courseId,
      lessonId,
      userId: access.user?.id,
      ...clientMeta,
      metadata: { route: 'playback' },
    })
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!access.lesson.video_asset_id) {
    return NextResponse.json({ status: 'none' satisfies SecurePlaybackResponse['status'] })
  }

  const asset = await getVideoAssetById(access.lesson.video_asset_id)
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
    lessonId,
    ttlSeconds: PLAYBACK_TTL_SECONDS,
    userId: access.user?.id,
  })

  if (!playback) {
    return NextResponse.json({ status: 'failed' })
  }

  const providerId = resolveAssetProviderId(asset)
  const isAdmin = access.user?.isAdmin === true

  const body: SecurePlaybackResponse = {
    status: 'ready',
    playbackMode: playback.mode,
    url: playback.url,
    hlsUrl: playback.hlsUrl,
    embedUrl: playback.embedUrl,
    encrypted: playback.encrypted,
    expiresAt: new Date(Date.now() + PLAYBACK_TTL_SECONDS * 1000).toISOString(),
    playbackProtection: resolvePlaybackProtectionCapabilities({
      encrypted: playback.encrypted ?? false,
      hlsUrl: playback.hlsUrl,
      url: playback.url,
      hasSession: false,
    }),
  }

  // Security: never hand a student a direct signed URL to the full-quality
  // source MP4 once HLS is available — that would bypass the HLS proxy, AES-128
  // encryption, playback-session gating and the watermark. Admins keep it for
  // debugging/download; students play exclusively through the protected HLS.
  if (body.hlsUrl && !isAdmin) {
    body.url = undefined
  }

  if (isAdmin) {
    body.provider = providerId
  }

  if (providerId === 'r2' && access.user && playback.hlsUrl) {
    const session = await createPlaybackSession({
      userId: access.user.id,
      courseId,
      lessonId,
      ...clientMeta,
    })
    body.session = {
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      renewBefore: session.renewBefore.toISOString(),
    }
    body.playbackProtection = resolvePlaybackProtectionCapabilities({
      encrypted: playback.encrypted ?? false,
      hlsUrl: playback.hlsUrl,
      url: playback.url,
      hasSession: true,
    })
    body.watermark = buildWatermarkConfig({
      lines: ['displayName', 'userId', 'timestamp', 'lessonTitle', 'courseTitle'],
    })
    body.watermarkContext = {
      displayName: access.user.displayName ?? undefined,
      userId: access.user.id,
      lessonTitle: access.lesson.title,
      courseTitle: access.course?.title,
    }

    const headers = new Headers({ 'Cache-Control': 'private, no-store' })
    headers.append(
      'Set-Cookie',
      buildSessionCookie(lessonId, session.token, session.expiresAt)
    )

    return NextResponse.json(body, { headers })
  }

  if (providerId === 'vimeo' && access.user) {
    body.watermark = buildWatermarkConfig({
      lines: ['displayName', 'userId', 'timestamp', 'lessonTitle', 'courseTitle'],
    })
    body.watermarkContext = {
      displayName: access.user.displayName ?? undefined,
      userId: access.user.id,
      lessonTitle: access.lesson.title,
      courseTitle: access.course?.title,
    }
  }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Playback-Session-Ttl': String(getSessionTtlSeconds()),
      'X-Playback-Renew-Before': String(getRenewBeforeSeconds()),
    },
  })
}
