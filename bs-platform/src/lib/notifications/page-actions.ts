'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getNotificationsPage } from '@/lib/notifications/get-notifications-page'
import {
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/push/notification-preferences'

export async function loadMoreNotifications(
  locale: string,
  cursor: string | null
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'unauthorized' as const }

  const page = await getNotificationsPage(user.id, cursor)
  return { success: true as const, ...page }
}

export async function saveNotificationPreferences(
  locale: string,
  prefs: Partial<NotificationPreferences>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'unauthorized' as const }

  const result = await updateNotificationPreferences(user.id, prefs)
  if (!result.success) return { error: result.error ?? 'save_failed' as const }

  revalidatePath(`/${locale}/dashboard/notifications`)
  return { success: true as const }
}
