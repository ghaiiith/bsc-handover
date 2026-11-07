'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { notifyAndEmail } from '@/lib/notify'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user.id
}

export async function approveCompanyAffiliationRequest(
  requestId: string,
  locale: string
): Promise<{ success?: boolean; error?: string; userName?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('company_affiliation_requests')
    .select('id, user_id, status, company_name, user:users(full_name, email)')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') return { error: 'invalid_request' }

  const user = Array.isArray(request.user) ? request.user[0] : request.user
  const userName = user?.full_name ?? ''

  await admin
    .from('company_affiliation_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  await admin.from('users').update({ role: 'company' }).eq('id', request.user_id)

  await syncUserAuthClaims(request.user_id)

  after(() =>
    notifyAndEmail({
      userId: request.user_id,
      title: 'Company affiliation approved',
      titleAr: 'تمت الموافقة على انتماء شركتك',
      body: `You can now post jobs and view talent portfolios on Business Skills.`,
      bodyAr: `يمكنك الآن نشر الوظائف وعرض ملفات المواهب على Business Skills.`,
      type: buildNotificationType(NotificationKind.companyApproved),
    })
  )

  revalidatePath(`/${locale}/admin/company-requests`)
  return { success: true, userName }
}

export async function rejectCompanyAffiliationRequest(
  requestId: string,
  adminNote: string,
  locale: string
): Promise<{ success?: boolean; error?: string; userName?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('company_affiliation_requests')
    .select('id, user_id, status, user:users(full_name)')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') return { error: 'invalid_request' }

  const user = Array.isArray(request.user) ? request.user[0] : request.user
  const userName = user?.full_name ?? ''

  await admin
    .from('company_affiliation_requests')
    .update({ status: 'rejected', admin_note: adminNote.trim() || null })
    .eq('id', requestId)

  after(() =>
    notifyAndEmail({
      userId: request.user_id,
      title: 'Company affiliation declined',
      titleAr: 'تم رفض طلب انتماء الشركة',
      body: adminNote.trim() || 'Your request was not approved at this time.',
      bodyAr: adminNote.trim() || 'لم تتم الموافقة على طلبك في الوقت الحالي.',
      type: buildNotificationType(NotificationKind.companyRejected),
    })
  )

  revalidatePath(`/${locale}/admin/company-requests`)
  return { success: true, userName }
}
