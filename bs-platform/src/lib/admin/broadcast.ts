import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchNotificationsPush } from '@/lib/notifications/dispatch'
import type { UserRole } from '@/types'

export type BroadcastAudience = 'all' | UserRole

export interface BroadcastInput {
  title: string
  titleAr: string
  body: string
  bodyAr: string
  /** 'all' or a specific role. */
  audience: BroadcastAudience
}

export interface BroadcastResult {
  success: boolean
  recipients: number
  error?: string
}

const CHUNK = 500

/**
 * Sends an in-app notification (and push, best-effort) to every active user in
 * the target audience. Admin-only — callers must verify the admin role first.
 */
export async function broadcastNotification(
  input: BroadcastInput
): Promise<BroadcastResult> {
  const admin = createAdminClient()

  let query = admin.from('users').select('id').eq('is_active', true)
  if (input.audience !== 'all') {
    query = query.eq('role', input.audience)
  }

  const { data: users, error: usersError } = await query
  if (usersError) {
    console.error('[broadcast] user lookup failed:', usersError.message)
    return { success: false, recipients: 0, error: 'user_lookup_failed' }
  }

  const ids = (users ?? []).map((u) => u.id as string)
  if (ids.length === 0) {
    return { success: true, recipients: 0 }
  }

  const type = `admin_broadcast:${input.audience}`

  // Chunked insert to stay within payload limits on large audiences.
  for (let i = 0; i < ids.length; i += CHUNK) {
    const rows = ids.slice(i, i + CHUNK).map((userId) => ({
      user_id: userId,
      title: input.title,
      title_ar: input.titleAr,
      body: input.body,
      body_ar: input.bodyAr,
      type,
      is_read: false,
    }))
    const { error } = await admin.from('notifications').insert(rows)
    if (error) {
      console.error('[broadcast] insert chunk failed:', error.message)
      return { success: false, recipients: i, error: 'insert_failed' }
    }
  }

  // Fire-and-forget push (does nothing if FCM is unconfigured).
  void dispatchNotificationsPush(
    ids.map((userId) => ({
      userId,
      title: input.title,
      titleAr: input.titleAr,
      body: input.body,
      bodyAr: input.bodyAr,
      type,
    }))
  )

  return { success: true, recipients: ids.length }
}
