'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { createNotification } from '@/lib/notifications'
import { notifyAndEmail } from '@/lib/notify'
import { getAppUrl } from '@/lib/seo/metadata'
import { buildInstructorApprovedEmail } from '@/lib/email/templates'

async function verifyAdmin(): Promise<string | null> {
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

export async function approveInstructorRequest(
  requestId: string,
  locale: string
): Promise<{ success?: boolean; error?: string; userName?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('instructor_requests')
    .select('id, user_id, status, user:users(full_name, email)')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') {
    return { error: 'invalid_request' }
  }

  const user = Array.isArray(request.user) ? request.user[0] : request.user
  const userName = user?.full_name ?? ''

  await admin
    .from('instructor_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  await admin
    .from('users')
    .update({ role: 'instructor' })
    .eq('id', request.user_id)

  await syncUserAuthClaims(request.user_id)

  const appUrl = getAppUrl()
  const userEmail = user?.email
  after(() =>
    notifyAndEmail(
      {
        userId: request.user_id,
        title: 'Instructor request approved',
        titleAr: 'تمت الموافقة على طلبك!',
        body: 'You can now create and publish your courses.',
        bodyAr: 'تمت الموافقة على طلبك! يمكنك الآن إنشاء كورساتك.',
        type: 'instructor_approved',
      },
      userEmail
        ? {
            to: userEmail,
            ...buildInstructorApprovedEmail({
              coursesNewUrl: `${appUrl}/${locale}/instructor/courses/new`,
            }),
          }
        : null
    )
  )

  revalidatePath(`/${locale}/admin/instructor-requests`)
  revalidatePath(`/${locale}/admin`)
  return { success: true, userName }
}

export async function rejectInstructorRequest(
  requestId: string,
  adminNote: string | undefined,
  locale: string
): Promise<{ success?: boolean; error?: string; userName?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('instructor_requests')
    .select('id, user_id, status, user:users(full_name)')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') {
    return { error: 'invalid_request' }
  }

  const user = Array.isArray(request.user) ? request.user[0] : request.user
  const userName = user?.full_name ?? ''

  await admin
    .from('instructor_requests')
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
        title: 'Instructor request rejected',
        titleAr: 'تم رفض طلبك',
        body: note ? `Your request was rejected. Note: ${note}` : 'Your instructor request was rejected.',
        bodyAr: note ? `تم رفض طلبك. ${note}` : 'تم رفض طلبك.',
        type: 'instructor_rejected',
      })
    )
  }

  revalidatePath(`/${locale}/admin/instructor-requests`)
  return { success: true, userName }
}
