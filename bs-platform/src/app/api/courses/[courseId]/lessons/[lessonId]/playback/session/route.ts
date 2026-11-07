import { NextResponse } from 'next/server'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'
import {
  createPlaybackSession,
  parsePlaybackSessionCookie,
  renewPlaybackSession,
  shouldRenewSession,
  touchPlaybackSessionActivity,
  validatePlaybackSession,
  buildSessionCookie,
} from '@/lib/video/playback-session'
import { getSessionConfigForClient } from '@/lib/video/playback-session-config'
import { extractClientMeta, logVideoSecurityEvent } from '@/lib/video/security-log'
import { checkDurableRateLimit, getClientIp } from '@/lib/rate-limit/durable'

export const runtime = 'nodejs'

interface SessionPostBody {
  activity?: boolean
  playbackState?: 'playing' | 'paused' | 'buffering' | 'idle'
}

function sessionJson(
  validated: {
    sessionId: string
    expiresAt: Date
    renewBefore: Date
  },
  extra?: { renewed?: boolean; created?: boolean; touched?: boolean }
) {
  const config = getSessionConfigForClient()
  return {
    valid: true,
    sessionId: validated.sessionId,
    expiresAt: validated.expiresAt.toISOString(),
    renewBefore: validated.renewBefore.toISOString(),
    renewed: extra?.renewed ?? false,
    created: extra?.created ?? false,
    touched: extra?.touched ?? false,
    config,
  }
}

/** Validates, touches activity, or silently renews an active playback session. */
export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const clientMeta = extractClientMeta(request)

  const rate = await checkDurableRateLimit({
    key: `playback-session:${lessonId}:ip:${getClientIp(request)}`,
    max: 60,
    windowSeconds: 60,
  })
  if (!rate.allowed) {
    return NextResponse.json({ valid: false, error: 'rate_limited' }, { status: 429 })
  }

  let body: SessionPostBody = {}
  try {
    body = (await request.json()) as SessionPostBody
  } catch {
    /* empty body is valid for legacy clients */
  }

  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed || !access.user) {
    await logVideoSecurityEvent({
      eventType: 'unauthorized_request',
      courseId,
      lessonId,
      userId: access?.user?.id,
      ...clientMeta,
      metadata: { route: 'session_renew', reason: 'forbidden' },
    })
    return NextResponse.json({ valid: false, error: 'forbidden' }, { status: 403 })
  }

  const token = parsePlaybackSessionCookie(request.headers.get('cookie'), lessonId)
  const validated = await validatePlaybackSession(courseId, lessonId, token, {
    touchActivity: body.activity !== true,
    clientMeta,
  })

  if (validated && token) {
    if (shouldRenewSession(validated.expiresAt)) {
      const renewed = await renewPlaybackSession(validated, token, clientMeta)
      if (renewed) {
        const headers = new Headers({ 'Cache-Control': 'private, no-store' })
        headers.append(
          'Set-Cookie',
          buildSessionCookie(lessonId, renewed.token, renewed.expiresAt)
        )
        return NextResponse.json(
          sessionJson(
            {
              sessionId: renewed.id,
              expiresAt: renewed.expiresAt,
              renewBefore: renewed.renewBefore,
            },
            { renewed: true }
          ),
          { headers }
        )
      }

      await logVideoSecurityEvent({
        eventType: 'playback_failed',
        userId: access.user.id,
        courseId,
        lessonId,
        sessionId: validated.sessionId,
        ...clientMeta,
        metadata: { route: 'session_renew', reason: 'renew_failed' },
      })
    } else if (body.activity === true) {
      const touched = await touchPlaybackSessionActivity(validated, token, clientMeta)
      if (touched) {
        const headers = new Headers({ 'Cache-Control': 'private, no-store' })
        headers.append(
          'Set-Cookie',
          buildSessionCookie(lessonId, touched.token, touched.expiresAt)
        )
        return NextResponse.json(
          sessionJson(
            {
              sessionId: touched.id,
              expiresAt: touched.expiresAt,
              renewBefore: touched.renewBefore,
            },
            { touched: true }
          ),
          { headers }
        )
      }
    }

    return NextResponse.json(sessionJson(validated))
  }

  const session = await createPlaybackSession({
    userId: access.user.id,
    courseId,
    lessonId,
    ...clientMeta,
  })

  const headers = new Headers({ 'Cache-Control': 'private, no-store' })
  headers.append('Set-Cookie', buildSessionCookie(lessonId, session.token, session.expiresAt))

  return NextResponse.json(
    sessionJson(
      {
        sessionId: session.id,
        expiresAt: session.expiresAt,
        renewBefore: session.renewBefore,
      },
      { created: true, renewed: true }
    ),
    { headers }
  )
}

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params

  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed) {
    return NextResponse.json({ valid: false, error: 'forbidden' }, { status: 403 })
  }

  const token = parsePlaybackSessionCookie(request.headers.get('cookie'), lessonId)
  const session = await validatePlaybackSession(courseId, lessonId, token, {
    touchActivity: false,
    clientMeta: extractClientMeta(request),
  })

  if (!session) {
    return NextResponse.json(
      { valid: false, error: 'session_invalid', needsRenewal: true },
      { status: 401 }
    )
  }

  return NextResponse.json({
    ...sessionJson(session),
    shouldRenew: shouldRenewSession(session.expiresAt),
    remainingSeconds: Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
    ),
  })
}
