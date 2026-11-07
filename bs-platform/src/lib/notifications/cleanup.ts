import { createAdminClient } from '@/lib/supabase/admin'

export interface NotificationCleanupResult {
  read_deleted: number
  unread_deleted: number
  fcm_tokens_deleted: number
}

export async function runNotificationCleanup(): Promise<NotificationCleanupResult> {
  const admin = createAdminClient()

  const { data: notifResult, error: notifError } = await admin.rpc(
    'cleanup_old_notifications'
  )

  if (notifError) {
    console.error('[notifications/cleanup] notifications:', notifError.message)
  }

  const { data: fcmDeleted, error: fcmError } = await admin.rpc(
    'cleanup_stale_fcm_tokens'
  )

  if (fcmError) {
    console.error('[notifications/cleanup] fcm tokens:', fcmError.message)
  }

  const parsed = (notifResult ?? {}) as {
    read_deleted?: number
    unread_deleted?: number
  }

  return {
    read_deleted: parsed.read_deleted ?? 0,
    unread_deleted: parsed.unread_deleted ?? 0,
    fcm_tokens_deleted: typeof fcmDeleted === 'number' ? fcmDeleted : 0,
  }
}
