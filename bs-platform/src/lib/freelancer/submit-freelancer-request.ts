'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/notifications'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'

export async function submitFreelancerRequest(
  reason: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const trimmedReason = reason.trim()
  if (trimmedReason.length < 20) return { error: 'reason_too_short' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'freelancer' || profile?.role === 'admin') {
    return { error: 'already_freelancer' }
  }

  const { data: pending } = await supabase
    .from('freelancer_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) return { error: 'pending_exists' }

  const { error } = await supabase.from('freelancer_requests').insert({
    user_id: user.id,
    reason: trimmedReason,
    status: 'pending',
  })

  if (error) return { error: 'submit_failed' }

  const admin = createAdminClient()
  const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')

  if (admins?.length) {
    after(() =>
      createNotifications(
        admins.map((a) => ({
          userId: a.id,
          title: 'New freelancer request',
          titleAr: 'طلب مستقل جديد',
          body: `${profile?.full_name ?? 'User'} submitted a freelancer application.`,
          bodyAr: `قدّم ${profile?.full_name ?? 'مستخدم'} طلب انضمام كمستقل.`,
          type: buildNotificationType(NotificationKind.freelancerRequest),
        }))
      )
    )
  }

  revalidatePath(`/${locale}/dashboard/become-freelancer`)
  revalidatePath(`/${locale}/dashboard`)
  return { success: true }
}

export async function getMyFreelancerRequest(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('freelancer_requests')
    .select('id, status, reason, admin_note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}
