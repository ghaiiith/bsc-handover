import { NextResponse } from 'next/server'
import { getLessonEncryptionKey } from '@/lib/video/encryption-keys'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'
import {
  parsePlaybackSessionCookie,
  validatePlaybackSession,
} from '@/lib/video/playback-session'
import { extractClientMeta, logVideoSecurityEvent } from '@/lib/video/security-log'
import { checkDurableRateLimit, getClientIp } from '@/lib/rate-limit/durable'

export const runtime = 'nodejs'

/** Delivers AES-128 HLS encryption key after authorization. Never served from R2. */
export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const clientMeta = extractClientMeta(request)

  const rate = await checkDurableRateLimit({
    key: `video-key:${lessonId}:ip:${getClientIp(request)}`,
    max: 120,
    windowSeconds: 60,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed) {
    await logVideoSecurityEvent({
      eventType: 'key_validation_failed',
      courseId,
      lessonId,
      userId: access?.user?.id,
      ...clientMeta,
      metadata: { reason: 'access_denied' },
    })
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const token = parsePlaybackSessionCookie(request.headers.get('cookie'), lessonId)
  const session = await validatePlaybackSession(courseId, lessonId, token, {
    clientMeta,
  })

  if (!session) {
    await logVideoSecurityEvent({
      eventType: 'key_validation_failed',
      courseId,
      lessonId,
      userId: access.user?.id,
      ...clientMeta,
      metadata: { reason: 'invalid_session' },
    })
    return NextResponse.json({ error: 'session_invalid' }, { status: 401 })
  }

  const keyMaterial = await getLessonEncryptionKey(courseId, lessonId)
  if (!keyMaterial) {
    return NextResponse.json({ error: 'key_not_found' }, { status: 404 })
  }

  await logVideoSecurityEvent({
    eventType: 'key_request',
    userId: session.userId,
    courseId,
    lessonId,
    sessionId: session.sessionId,
    ...clientMeta,
  })

  return new NextResponse(new Uint8Array(keyMaterial.key), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'private, no-store, no-cache',
    },
  })
}
