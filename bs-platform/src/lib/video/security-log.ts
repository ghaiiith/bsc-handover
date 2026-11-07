import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { SecurityEventType } from '@/types/content-protection'

export interface SecurityLogInput {
  eventType: SecurityEventType
  userId?: string | null
  courseId?: string | null
  lessonId?: string | null
  sessionId?: string | null
  clientIp?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

/** Append-only structured security audit log. */
export async function logVideoSecurityEvent(input: SecurityLogInput): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('video_security_logs').insert({
      event_type: input.eventType,
      user_id: input.userId ?? null,
      course_id: input.courseId ?? null,
      lesson_id: input.lessonId ?? null,
      session_id: input.sessionId ?? null,
      client_ip: input.clientIp ?? null,
      user_agent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    })
  } catch (err) {
    console.error('[security-log] write failed:', err)
  }
}

export function extractClientMeta(request: Request): {
  clientIp: string | null
  userAgent: string | null
} {
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip')
  return {
    clientIp: clientIp ?? null,
    userAgent: request.headers.get('user-agent'),
  }
}
