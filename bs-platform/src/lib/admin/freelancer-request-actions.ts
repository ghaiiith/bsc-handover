'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { createNotification } from '@/lib/notifications'
import { getAppUrl } from '@/lib/seo/metadata'

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

export async function approveFreelancerRequest(
  requestId: string,
  locale: string
): Promise<{ success?: boolean; error?: string; userName?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('freelancer_requests')
    .select('id, user_id, status, user:users(full_name, email)')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') {
    return { error: 'invalid_request' }
  }

  const user = Array.isArray(request.user) ? request.user[0] : request.user
  const userName = user?.full_name ?? ''

  await admin.from('freelancer_requests').update({ status: 'approved' }).eq('id', requestId)

  await admin.from('users').update({ role: 'freelancer' }).eq('id', request.user_id)

  await syncUserAuthClaims(request.user_id)

  after(() =>
    createNotification({
      userId: request.user_id,
      title: 'Freelancer request approved',
      titleAr: 'تمت الموافقة على طلب المستقل',
      body: 'You can now create and manage service listings.',
      bodyAr: 'يمكنك الآن إنشاء وإدارة خدماتك على المنصة.',
      type: 'freelancer_approved',
    })
  )

  revalidatePath(`/${locale}/admin/freelancer-requests`)
  revalidatePath(`/${locale}/admin`)
  void getAppUrl()
  return { success: true, userName }
}

export async function rejectFreelancerRequest(
  requestId: string,
  adminNote: string | undefined,
  locale: string
): Promise<{ success?: boolean; error?: string; userName?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('freelancer_requests')
    .select('id, user_id, status, user:users(full_name)')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') {
    return { error: 'invalid_request' }
  }

  const user = Array.isArray(request.user) ? request.user[0] : request.user
  const userName = user?.full_name ?? ''

  await admin
    .from('freelancer_requests')
    .update({
      status: 'rejected',
      admin_note: adminNote?.trim() || null,
    })
    .eq('id', requestId)

  if (request.user_id) {
    const note = adminNote?.trim()
    after(() =>
      createNotification({
        userId: request.user_id,
        title: 'Freelancer request rejected',
        titleAr: 'تم رفض طلب المستقل',
        body: note ? `Your request was rejected. Note: ${note}` : 'Your freelancer request was rejected.',
        bodyAr: note ? `تم رفض طلبك. ${note}` : 'تم رفض طلب الانضمام كمستقل.',
        type: 'freelancer_rejected',
      })
    )
  }

  revalidatePath(`/${locale}/admin/freelancer-requests`)
  return { success: true, userName }
}
