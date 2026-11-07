import { NextResponse } from 'next/server'
import { hlsObjectKey } from '@/lib/storage/object-keys'
import { getStorageProvider } from '@/lib/storage/provider'
import { isLessonEncrypted } from '@/lib/video/encryption-keys'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'
import {
  resolveHlsContentType,
  rewriteEncryptedPlaylist,
  sanitizeHlsRelativePath,
} from '@/lib/video/hls-playback'
import {
  parsePlaybackSessionCookie,
  validatePlaybackSession,
} from '@/lib/video/playback-session'
import { extractClientMeta, logVideoSecurityEvent } from '@/lib/video/security-log'
import { checkDurableRateLimit, getClientIp } from '@/lib/rate-limit/durable'

export const runtime = 'nodejs'

// Generous cap: normal playback pulls ~10 segments/min; this only trips on rapid
// scraping (pulling an entire course's segments as fast as bandwidth allows).
const HLS_MAX_PER_MINUTE = 600

export async function GET(
  request: Request,
  context: {
    params: Promise<{ courseId: string; lessonId: string; path: string[] }>
  }
) {
  const { courseId, lessonId, path } = await context.params
  const clientMeta = extractClientMeta(request)
  const referer = request.headers.get('referer')
  const secFetchSite = request.headers.get('sec-fetch-site')

  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!access.allowed) {
    await logVideoSecurityEvent({
      eventType: 'hotlink_attempt',
      courseId,
      lessonId,
      userId: access.user?.id,
      ...clientMeta,
      metadata: { referer, secFetchSite },
    })
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rateKey = access.user?.id
    ? `hls:${lessonId}:user:${access.user.id}`
    : `hls:${lessonId}:ip:${getClientIp(request)}`
  const rate = await checkDurableRateLimit({
    key: rateKey,
    max: HLS_MAX_PER_MINUTE,
    windowSeconds: 60,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const encrypted = await isLessonEncrypted(courseId, lessonId)
  if (encrypted) {
    const token = parsePlaybackSessionCookie(request.headers.get('cookie'), lessonId)
    const session = await validatePlaybackSession(courseId, lessonId, token, {
      clientMeta,
    })
    if (!session) {
      await logVideoSecurityEvent({
        eventType: 'hotlink_attempt',
        courseId,
        lessonId,
        userId: access.user?.id,
        ...clientMeta,
        metadata: { reason: 'missing_session', referer },
      })
      return NextResponse.json({ error: 'session_invalid' }, { status: 401 })
    }
  }

  const relativePath = sanitizeHlsRelativePath(path)
  if (!relativePath) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
  }

  const objectKey = hlsObjectKey(courseId, lessonId, relativePath)
  const object = await getStorageProvider().getObject(objectKey)
  if (!object) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const contentType = object.contentType ?? resolveHlsContentType(relativePath)

  if (relativePath.endsWith('.m3u8') && encrypted) {
    const raw = await object.body.transformToString()
    const rewritten = rewriteEncryptedPlaylist(raw, courseId, lessonId)
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    })
  }

  return new NextResponse(object.body.transformToWebStream(), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      ...(object.contentLength != null
        ? { 'Content-Length': String(object.contentLength) }
        : {}),
    },
  })
}
