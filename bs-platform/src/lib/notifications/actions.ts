'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function markAllUserNotificationsRead(locale: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  revalidatePath(`/${locale}/dashboard/notifications`)
  return { success: true }
}

export async function markUserNotificationRead(
  notificationId: string,
  locale: string
) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  revalidatePath(`/${locale}/dashboard/notifications`)
  return { success: true }
}
