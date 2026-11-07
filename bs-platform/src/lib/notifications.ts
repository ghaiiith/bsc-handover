import { createAdminClient } from '@/lib/supabase/admin'
import {
  dispatchNotificationPush,
  isUserAdmin,
} from '@/lib/notifications/dispatch'

export interface CreateNotificationInput {
  userId: string
  title: string
  titleAr: string
  body: string
  bodyAr: string
  /** Encodes type and optional IDs, e.g. enrollment:courseId:lessonId */
  type: string
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('notifications').insert({
      user_id: input.userId,
      title: input.title,
      title_ar: input.titleAr,
      body: input.body,
      body_ar: input.bodyAr,
      type: input.type,
      is_read: false,
    })

    if (error) {
      console.error('[notifications] Insert failed:', error)
      return { success: false, error: error.message }
    }

    const isAdmin = await isUserAdmin(input.userId)
    void dispatchNotificationPush(input, { isAdmin })

    return { success: true }
  } catch (err) {
    console.error('[notifications] Unexpected error:', err)
    return { success: false, error: 'unexpected_error' }
  }
}

export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  if (!inputs.length) return

  const admin = createAdminClient()
  const rows = inputs.map((input) => ({
    user_id: input.userId,
    title: input.title,
    title_ar: input.titleAr,
    body: input.body,
    body_ar: input.bodyAr,
    type: input.type,
    is_read: false,
  }))

  const { error } = await admin.from('notifications').insert(rows)
  if (error) {
    console.error('[notifications] Batch insert failed:', error)
    return
  }

  const adminFlags = await Promise.all(
    inputs.map((input) => isUserAdmin(input.userId))
  )

  await Promise.allSettled(
    inputs.map((input, index) =>
      dispatchNotificationPush(input, { isAdmin: adminFlags[index] })
    )
  )
}
