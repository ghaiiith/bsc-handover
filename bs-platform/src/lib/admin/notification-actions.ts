'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user.id
}

export async function markAllNotificationsRead(locale: string) {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', adminId)
    .eq('is_read', false)

  revalidatePath(`/${locale}/admin`)
  return { success: true }
}

export async function markNotificationRead(notificationId: string, locale: string) {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', adminId)

  revalidatePath(`/${locale}/admin/notifications`)
  return { success: true }
}
