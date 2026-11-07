'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInstructorRequestSubmittedNotifications } from '@/lib/instructor/send-instructor-notifications'

export async function submitInstructorRequest(
  reason: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const trimmed = reason.trim()
  if (trimmed.length < 20) {
    return { error: 'reason_too_short' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'unauthorized' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'instructor' || profile?.role === 'admin') {
    return { error: 'already_instructor' }
  }

  const { data: pending } = await supabase
    .from('instructor_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) {
    return { error: 'pending_exists' }
  }

  const { error } = await supabase.from('instructor_requests').insert({
    user_id: user.id,
    reason: trimmed,
    status: 'pending',
  })

  if (error) {
    return { error: 'submit_failed' }
  }

  const { data: created } = await supabase
    .from('instructor_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: profileName } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (created?.id) {
    after(() =>
      sendInstructorRequestSubmittedNotifications(
        created.id as string,
        profileName?.full_name ?? 'User'
      )
    )
  }

  revalidatePath(`/${locale}/dashboard/become-instructor`)
  revalidatePath(`/${locale}/dashboard`)
  return { success: true }
}

export async function getMyInstructorRequest(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('instructor_requests')
    .select('id, status, reason, admin_note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}
