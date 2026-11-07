'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/notifications'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'

export async function submitCompanyAffiliationRequest(
  companyName: string,
  companyNameAr: string,
  reason: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const trimmedName = companyName.trim()
  const trimmedReason = reason.trim()
  if (trimmedName.length < 2) return { error: 'company_name_required' }
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

  if (profile?.role === 'company' || profile?.role === 'admin' || profile?.role === 'instructor') {
    return { error: 'already_company' }
  }

  const { data: pending } = await supabase
    .from('company_affiliation_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) return { error: 'pending_exists' }

  const { error } = await supabase.from('company_affiliation_requests').insert({
    user_id: user.id,
    company_name: trimmedName,
    company_name_ar: companyNameAr.trim() || null,
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
          title: 'New company affiliation request',
          titleAr: 'طلب انتماء شركة جديد',
          body: `${profile?.full_name ?? 'User'} requested affiliation for ${trimmedName}.`,
          bodyAr: `طلب ${profile?.full_name ?? 'مستخدم'} الانتماء لشركة ${trimmedName}.`,
          type: buildNotificationType(NotificationKind.companyRequest),
        }))
      )
    )
  }

  revalidatePath(`/${locale}/dashboard/company-affiliation`)
  return { success: true }
}

export async function getMyCompanyAffiliationRequest(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('company_affiliation_requests')
    .select('id, status, company_name, company_name_ar, reason, admin_note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}
