'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  return profile?.role === 'admin' ? user.id : null
}

export interface AdminApplicationRow {
  id: string
  status: string
  applied_at: string
  job_title: string
  applicant_email: string
}

/** Recent applications, for the admin privacy/removal screen (report BS-66). */
export async function getAdminApplications(limit = 50): Promise<AdminApplicationRow[]> {
  if (!(await verifyAdmin())) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('job_applications')
    .select('id, status, applied_at, job:jobs(title), applicant:users!applicant_id(email)')
    .order('applied_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => {
    const job = Array.isArray(r.job) ? r.job[0] : r.job
    const applicant = Array.isArray(r.applicant) ? r.applicant[0] : r.applicant
    return {
      id: r.id as string,
      status: r.status as string,
      applied_at: r.applied_at as string,
      job_title: (job?.title as string) ?? '—',
      applicant_email: (applicant?.email as string) ?? '—',
    }
  })
}

/**
 * Report BS-66: applications are never deleted from the employer screen. When a
 * record genuinely must disappear (a privacy request), an ADMINISTRATOR removes
 * it and the removal is LOGGED — who, when, why, plus a snapshot of the row.
 */
export async function adminDeleteApplication(
  applicationId: string,
  reason: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }
  const why = reason.trim()
  if (why.length < 10) return { error: 'reason_required' }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('job_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle()
  if (!row) return { error: 'not_found' }

  const { error: logError } = await admin.from('application_deletion_log').insert({
    application_id: applicationId,
    job_id: row.job_id,
    applicant_id: row.applicant_id,
    deleted_by: adminId,
    reason: why.slice(0, 1000),
    snapshot: row,
  })
  // The audit entry must exist BEFORE the row goes — no silent deletions.
  if (logError) return { error: logError.message }

  const { error } = await admin.from('job_applications').delete().eq('id', applicationId)
  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/applications`)
  return { success: true }
}
