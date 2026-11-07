import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  computeRenewBeforeDate,
  isSessionIdleExpired,
  PLAYBACK_SESSION_TTL_SECONDS,
  PLAYBACK_SESSION_RENEW_BEFORE_SECONDS,
  shouldRenewSession,
} from '@/lib/video/playback-session-config'
import { logVideoSecurityEvent } from '@/lib/video/security-log'

export const PLAYBACK_SESSION_COOKIE_PREFIX = 'eduwork-playback-'

export function playbackSessionCookieName(lessonId: string): string {
  return `${PLAYBACK_SESSION_COOKIE_PREFIX}${lessonId}`
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface CreatePlaybackSessionInput {
  userId: string
  courseId: string
  lessonId: string
  clientIp?: string | null
  userAgent?: string | null
}

export interface PlaybackSessionRecord {
  id: string
  token: string
  expiresAt: Date
  renewBefore: Date
}

export async function createPlaybackSession(
  input: CreatePlaybackSessionInput
): Promise<PlaybackSessionRecord> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + PLAYBACK_SESSION_TTL_SECONDS * 1000)
  const renewBefore = computeRenewBeforeDate(expiresAt)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('playback_sessions')
    .insert({
      user_id: input.userId,
      course_id: input.courseId,
      lesson_id: input.lessonId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      client_ip: input.clientIp ?? null,
      user_agent: input.userAgent ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('session_create_failed')
  }

  await logVideoSecurityEvent({
    eventType: 'playback_started',
    userId: input.userId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    sessionId: data.id as string,
    clientIp: input.clientIp,
    userAgent: input.userAgent,
    metadata: { action: 'session_created' },
  })

  return {
    id: data.id as string,
    token,
    expiresAt,
    renewBefore,
  }
}

export interface ValidatedSession {
  sessionId: string
  userId: string
  courseId: string
  lessonId: string
  expiresAt: Date
  renewBefore: Date
  lastActivityAt: Date
}

async function assertSessionAccess(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) return false

  const [{ data: profile }, { data: enrollment }, { data: course }, { data: lesson }] =
    await Promise.all([
      admin.from('users').select('role, is_active').eq('id', user.id).maybeSingle(),
      admin
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle(),
      admin.from('courses').select('instructor_id').eq('id', courseId).maybeSingle(),
      admin.from('lessons').select('is_free_preview').eq('id', lessonId).maybeSingle(),
    ])

  if (profile?.is_active === false) return false

  if (!lesson?.is_free_preview) {
    const isAdmin = profile?.role === 'admin'
    const isOwner = course?.instructor_id === user.id
    if (!isAdmin && !isOwner && !enrollment) return false
  }

  return true
}

export async function validatePlaybackSession(
  courseId: string,
  lessonId: string,
  token: string | null | undefined,
  options?: {
    touchActivity?: boolean
    clientMeta?: { clientIp?: string | null; userAgent?: string | null }
  }
): Promise<ValidatedSession | null> {
  if (!token) return null

  const admin = createAdminClient()
  const tokenHash = hashToken(token)

  const { data: session } = await admin
    .from('playback_sessions')
    .select(
      'id, user_id, course_id, lesson_id, expires_at, revoked_at, last_validated_at, client_ip, user_agent'
    )
    .eq('token_hash', tokenHash)
    .eq('course_id', courseId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!session || session.revoked_at) return null

  // Device/IP binding: a session cookie is issued to one device. A different
  // user-agent means the cookie was copied to another browser/device → reject
  // and revoke (stops session sharing). An IP change alone is expected on mobile
  // (wifi↔cellular), so it is only logged as an anomaly for the leak scanner.
  const meta = options?.clientMeta
  if (meta) {
    const boundUa = session.user_agent as string | null
    if (boundUa && meta.userAgent && boundUa !== meta.userAgent) {
      await admin
        .from('playback_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', session.id as string)
      await logVideoSecurityEvent({
        eventType: 'session_device_mismatch',
        userId: session.user_id as string,
        courseId,
        lessonId,
        sessionId: session.id as string,
        clientIp: meta.clientIp ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { reason: 'user_agent_changed' },
      })
      return null
    }
    const boundIp = session.client_ip as string | null
    if (boundIp && meta.clientIp && boundIp !== meta.clientIp) {
      await logVideoSecurityEvent({
        eventType: 'session_ip_changed',
        userId: session.user_id as string,
        courseId,
        lessonId,
        sessionId: session.id as string,
        clientIp: meta.clientIp ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { from: boundIp, to: meta.clientIp },
      })
    }
  }

  const expiresAt = new Date(session.expires_at as string)
  if (expiresAt.getTime() <= Date.now()) {
    await logVideoSecurityEvent({
      eventType: 'session_expired',
      userId: session.user_id as string,
      courseId,
      lessonId,
      sessionId: session.id as string,
      metadata: { reason: 'ttl_expired' },
    })
    return null
  }

  const lastActivityAt = new Date(
    (session.last_validated_at as string) ?? session.expires_at
  )
  if (isSessionIdleExpired(lastActivityAt)) {
    await admin
      .from('playback_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', session.id as string)
    await logVideoSecurityEvent({
      eventType: 'session_expired',
      userId: session.user_id as string,
      courseId,
      lessonId,
      sessionId: session.id as string,
      metadata: { reason: 'idle_timeout' },
    })
    return null
  }

  const allowed = await assertSessionAccess(
    session.user_id as string,
    courseId,
    lessonId
  )
  if (!allowed) return null

  if (options?.touchActivity !== false) {
    await admin
      .from('playback_sessions')
      .update({ last_validated_at: new Date().toISOString() })
      .eq('id', session.id as string)
  }

  return {
    sessionId: session.id as string,
    userId: session.user_id as string,
    courseId: session.course_id as string,
    lessonId: session.lesson_id as string,
    expiresAt,
    renewBefore: computeRenewBeforeDate(expiresAt),
    lastActivityAt,
  }
}

/** Sliding window — extends TTL on legitimate lesson activity. */
export async function touchPlaybackSessionActivity(
  validated: ValidatedSession,
  token: string,
  clientMeta?: { clientIp?: string | null; userAgent?: string | null }
): Promise<PlaybackSessionRecord | null> {
  const newExpiresAt = new Date(Date.now() + PLAYBACK_SESSION_TTL_SECONDS * 1000)
  const renewBefore = computeRenewBeforeDate(newExpiresAt)
  const nowIso = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('playback_sessions')
    .update({
      expires_at: newExpiresAt.toISOString(),
      last_validated_at: nowIso,
    })
    .eq('id', validated.sessionId)
    .eq('user_id', validated.userId)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .select('id')
    .maybeSingle()

  if (error || !data) return null

  await logVideoSecurityEvent({
    eventType: 'session_renewed',
    userId: validated.userId,
    courseId: validated.courseId,
    lessonId: validated.lessonId,
    sessionId: validated.sessionId,
    clientIp: clientMeta?.clientIp,
    userAgent: clientMeta?.userAgent,
    metadata: { action: 'activity_touch', newExpiresAt: newExpiresAt.toISOString() },
  })

  return {
    id: validated.sessionId,
    token,
    expiresAt: newExpiresAt,
    renewBefore,
  }
}

export async function renewPlaybackSession(
  validated: ValidatedSession,
  token: string,
  clientMeta?: { clientIp?: string | null; userAgent?: string | null }
): Promise<PlaybackSessionRecord | null> {
  const newExpiresAt = new Date(Date.now() + PLAYBACK_SESSION_TTL_SECONDS * 1000)
  const renewBefore = computeRenewBeforeDate(newExpiresAt)
  const nowIso = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('playback_sessions')
    .update({
      expires_at: newExpiresAt.toISOString(),
      last_validated_at: nowIso,
    })
    .eq('id', validated.sessionId)
    .eq('user_id', validated.userId)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .select('id')
    .maybeSingle()

  if (error || !data) return null

  await logVideoSecurityEvent({
    eventType: 'session_renewed',
    userId: validated.userId,
    courseId: validated.courseId,
    lessonId: validated.lessonId,
    sessionId: validated.sessionId,
    clientIp: clientMeta?.clientIp,
    userAgent: clientMeta?.userAgent,
    metadata: {
      previousExpiresAt: validated.expiresAt.toISOString(),
      newExpiresAt: newExpiresAt.toISOString(),
    },
  })

  return {
    id: validated.sessionId,
    token,
    expiresAt: newExpiresAt,
    renewBefore,
  }
}

export async function revokePlaybackSessionsForUser(userId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('playback_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)
}

export function parsePlaybackSessionCookie(
  cookieHeader: string | null,
  lessonId: string
): string | null {
  if (!cookieHeader) return null
  const name = `${playbackSessionCookieName(lessonId)}=`
  const part = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name))
  if (!part) return null
  return decodeURIComponent(part.slice(name.length))
}

export function buildSessionCookie(
  lessonId: string,
  token: string,
  expiresAt: Date
): string {
  const name = playbackSessionCookieName(lessonId)
  const maxAge = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`
}

export function getSessionTtlSeconds(): number {
  return PLAYBACK_SESSION_TTL_SECONDS
}

export function getRenewBeforeSeconds(): number {
  return PLAYBACK_SESSION_RENEW_BEFORE_SECONDS
}

export { shouldRenewSession, computeRenewBeforeDate }
