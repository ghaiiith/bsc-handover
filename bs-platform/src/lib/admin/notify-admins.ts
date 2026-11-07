import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchNotificationsPush } from '@/lib/notifications/dispatch'

interface NotifyAdminPayload {
  title: string
  titleAr: string
  body: string
  bodyAr: string
  type: string
}

export async function notifyAllAdmins(payload: NotifyAdminPayload) {
  const admin = createAdminClient()

  const { data: admins } = await admin
    .from('users')
    .select('id')
    .eq('role', 'admin')

  if (!admins?.length) return

  const rows = admins.map((a) => ({
    user_id: a.id,
    title: payload.title,
    title_ar: payload.titleAr,
    body: payload.body,
    body_ar: payload.bodyAr,
    type: payload.type,
    is_read: false,
  }))

  const { error } = await admin.from('notifications').insert(rows)
  if (error) {
    console.error('[notify-admins] Batch insert failed:', error.message)
    return
  }

  void dispatchNotificationsPush(
    admins.map((a) => ({
      userId: a.id as string,
      title: payload.title,
      titleAr: payload.titleAr,
      body: payload.body,
      bodyAr: payload.bodyAr,
      type: payload.type,
    })),
    { isAdmin: true }
  )
}
