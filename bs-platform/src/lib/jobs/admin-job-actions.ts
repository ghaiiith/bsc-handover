'use server'

import { revalidatePath } from 'next/cache'
import { revalidateJobsListingCache } from '@/lib/cache/invalidate-listing-cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jobFormSchema, type JobFormValues } from '@/lib/jobs/job-form-schemas'
import type { PostgrestError } from '@supabase/supabase-js'

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

function normalizeContact(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeWhatsapp(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  return digits || null
}

function normalizeSkills(skills: string[]): string[] {
  return skills.map((s) => s.trim().toLowerCase()).filter(Boolean)
}

function logJobError(label: string, error: PostgrestError | null) {
  if (!error) return
  console.error(`[admin/jobs] ${label}:`, error.message, error.code, error.details)
}

/** A published job stays live for 30 days before it must be renewed (BS-16). */
const JOB_LIFETIME_DAYS = 30

function jobExpiryFromNow(): string {
  return new Date(Date.now() + JOB_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

function buildJobPayload(data: JobFormValues, status: string) {
  return {
    title: data.title,
    title_ar: data.title_ar,
    company_name: data.company_name,
    city: data.city,
    job_type: data.job_type,
    salary_min: data.salary_min ?? null,
    salary_max: data.salary_max ?? null,
    deadline: data.deadline || null,
    skills: normalizeSkills(data.skills),
    description: data.description,
    description_ar: data.description_ar,
    contact_email: normalizeContact(data.contact_email),
    contact_phone: normalizeContact(data.contact_phone),
    contact_link: normalizeContact(data.contact_link),
    whatsapp_number: normalizeWhatsapp(data.whatsapp_number),
    status,
    // Publishing (re)starts the 30-day lifetime; drafts have no expiry.
    expires_at: status === 'active' ? jobExpiryFromNow() : null,
  }
}

async function writeJob(
  adminId: string,
  payload: ReturnType<typeof buildJobPayload>,
  jobId?: string
): Promise<{ id?: string; error?: string }> {
  const writePayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  }

  // Prefer service role (bypasses RLS)
  try {
    const admin = createAdminClient()

    if (jobId) {
      const { error } = await admin.from('jobs').update(writePayload).eq('id', jobId)
      if (error) {
        logJobError('admin update', error)
        return { error: error.message }
      }
      return { id: jobId }
    }

    const { data: created, error } = await admin
      .from('jobs')
      .insert({ ...writePayload, admin_id: adminId })
      .select('id')
      .single()

    if (error) {
      logJobError('admin insert', error)
      return { error: error.message }
    }
    return { id: created?.id as string }
  } catch (err) {
    console.warn('[admin/jobs] Admin client unavailable, using session client:', err)
  }

  // Fallback: admin session + RLS policy jobs_admin_all
  const supabase = await createClient()

  if (jobId) {
    const { error } = await supabase.from('jobs').update(writePayload).eq('id', jobId)
    if (error) {
      logJobError('session update', error)
      return { error: error.message }
    }
    return { id: jobId }
  }

  const { data: created, error } = await supabase
    .from('jobs')
    .insert({ ...writePayload, admin_id: adminId })
    .select('id')
    .single()

  if (error) {
    logJobError('session insert', error)
    return { error: error.message }
  }

  return { id: created?.id as string }
}

export async function saveJob(
  values: JobFormValues,
  locale: string,
  jobId?: string
): Promise<{ success?: boolean; error?: string; jobId?: string; pendingReview?: boolean }> {
  const adminId = await verifyAdmin()
  if (!adminId) {
    return { error: 'unauthorized' }
  }

  const parsed = jobFormSchema.safeParse(values)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'invalid' }
  }

  const status = parsed.data.publish ? 'active' : 'draft'
  const payload = buildJobPayload(parsed.data, status)

  const result = await writeJob(adminId, payload, jobId)

  if (result.error) {
    if (result.error.includes('contact_')) {
      return {
        error: 'missing_db_columns',
      }
    }
    return { error: result.error }
  }

  if (!result.id) {
    return { error: 'create_failed' }
  }

  revalidateJobsListingCache()
  revalidatePath(`/${locale}/admin/jobs`)
  revalidatePath(`/${locale}/jobs`)
  if (jobId) {
    revalidatePath(`/${locale}/jobs/${jobId}`)
  } else {
    revalidatePath(`/${locale}/jobs/${result.id}`)
  }

  return { success: true, jobId: result.id }
}

export async function toggleJobStatus(
  jobId: string,
  locale: string
): Promise<{ success?: boolean; error?: string; newStatus?: string }> {
  if (!(await verifyAdmin())) {
    return { error: 'unauthorized' }
  }

  let client
  try {
    client = createAdminClient()
  } catch {
    client = await createClient()
  }

  const { data: job } = await client
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'not_found' }

  const newStatus = job.status === 'active' ? 'closed' : 'active'
  const { error } = await client
    .from('jobs')
    .update({
      status: newStatus,
      // Re-activating (incl. renewing an expired job) restarts the 30-day window.
      ...(newStatus === 'active' ? { expires_at: jobExpiryFromNow() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidateJobsListingCache()
  revalidatePath(`/${locale}/admin/jobs`)
  revalidatePath(`/${locale}/jobs`)
  return { success: true, newStatus }
}

export async function deleteJob(
  jobId: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) {
    return { error: 'unauthorized' }
  }

  let client
  try {
    client = createAdminClient()
  } catch {
    client = await createClient()
  }

  const { error } = await client.from('jobs').delete().eq('id', jobId)

  if (error) return { error: error.message }

  revalidateJobsListingCache()
  revalidatePath(`/${locale}/admin/jobs`)
  revalidatePath(`/${locale}/jobs`)
  return { success: true }
}

// ---- Report BS-53: approve/reject company edits to live jobs ----

/** Jobs with a company edit awaiting review. */
export async function getPendingJobEdits() {
  const adminId = await verifyAdmin()
  if (!adminId) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('jobs')
    .select('id, title, title_ar, company_name, pending_changes, pending_submitted_at, posted_by')
    .eq('pending_review_status', 'pending')
    .order('pending_submitted_at', { ascending: true })
  return data ?? []
}

/** Apply the held changes to the live job and clear the pending state. */
export async function approveJobEdit(jobId: string, locale: string) {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: job } = await admin
    .from('jobs')
    .select('id, pending_changes, pending_review_status')
    .eq('id', jobId)
    .maybeSingle()

  if (!job || job.pending_review_status !== 'pending') return { error: 'no_pending_edit' }

  const { republish: _flag, ...changes } = (job.pending_changes ?? {}) as Record<string, unknown>

  // Round 9 (BS-103): a held REPUBLISH request carries status:'active'; approving
  // it re-lists the job with a fresh 30-day window and stamps published_at so
  // it counts against the company's monthly allowance for THIS period.
  const republishing = changes.status === 'active'
  const nowIso = new Date().toISOString()
  const { error } = await admin
    .from('jobs')
    .update({
      ...changes,
      ...(republishing
        ? { expires_at: jobExpiryFromNow(), published_at: nowIso }
        : {}),
      pending_changes: null,
      pending_review_status: 'none',
      pending_rejection_reason: null,
      pending_submitted_at: null,
      updated_at: nowIso,
    })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidateJobsListingCache()
  revalidatePath(`/${locale}/admin/jobs`)
  revalidatePath(`/${locale}/jobs`)
  return { success: true }
}

/** Discard the held changes and return a reason to the company. */
export async function rejectJobEdit(jobId: string, reason: string, locale: string) {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('jobs')
    .update({
      pending_changes: null,
      pending_review_status: 'rejected',
      pending_rejection_reason: reason.trim().slice(0, 500) || null,
      pending_submitted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('pending_review_status', 'pending')

  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/jobs`)
  return { success: true }
}
