'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { revalidateJobsListingCache } from '@/lib/cache/invalidate-listing-cache'
import { jobFormSchema, type JobFormValues } from '@/lib/jobs/job-form-schemas'
import { countActiveCompanyJobs, getEffectiveJobQuota } from '@/lib/jobs/employer-quota'
import { getCompanyEntitlements, getJobPublishAllowance } from '@/lib/subscription/entitlements'
import { resolveJobSaveTransition } from '@/lib/jobs/job-save-transition'
import type { PostgrestError } from '@supabase/supabase-js'

async function verifyCompanyRep(): Promise<string | null> {
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

  if (profile?.role !== 'company') return null
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

// A published job stays live for 30 days before it must be renewed (BS-16).
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
    // Round 9: the monthly cap counts publications (BS-109/110/111).
    published_at: status === 'active' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }
}

function logJobError(label: string, error: PostgrestError | null) {
  if (!error) return
  console.error(`[company/jobs] ${label}:`, error.message)
}

export async function saveCompanyJob(
  values: JobFormValues,
  locale: string,
  jobId?: string
): Promise<{ success?: boolean; error?: string; jobId?: string; pendingReview?: boolean }> {
  const userId = await verifyCompanyRep()
  if (!userId) return { error: 'unauthorized' }

  const parsed = jobFormSchema.safeParse(values)
  if (!parsed.success) return { error: 'validation_failed' }

  const status = parsed.data.publish ? 'active' : 'draft'
  const basePayload = buildJobPayload(parsed.data, status)
  const supabase = await createClient()

  // Round 9 (BS-111): "featured" is an Enterprise entitlement, validated here —
  // a request that asks for it without the plan is saved un-featured, never
  // rejected, so a downgrade cannot strand a job.
  let isFeatured = false
  if (parsed.data.featured) {
    const ent = await getCompanyEntitlements(userId)
    isFeatured = ent.features.featured_jobs
  }
  const payload = { ...basePayload, is_featured: isFeatured && status === 'active' }

  // Company-profile spec: a company below the completion threshold cannot
  // publish a job (drafts are always allowed). Mirrors the discovery gate.
  if (status === 'active') {
    const { data: me } = await supabase
      .from('users')
      .select('profile_completed_at')
      .eq('id', userId)
      .maybeSingle()
    if (!me?.profile_completed_at) {
      return { error: 'profile_incomplete' }
    }
  }

  if (jobId) {
    const { data: existing } = await supabase
      .from('jobs')
      .select('id, posted_by, status, published_at')
      .eq('id', jobId)
      .maybeSingle()

    if (!existing || existing.posted_by !== userId) return { error: 'not_found' }

    const transition = resolveJobSaveTransition({
      existingStatus: existing.status as string,
      everPublished: Boolean(existing.published_at),
      requestedStatus: status,
    })

    // Round 9 (BS-103): moving a job to Draft is a private act — it leaves the
    // public listing at once and never enters the approval queue. Any pending
    // edit is discarded with it, because the draft now holds the latest text.
    if (transition === 'unpublish') {
      const { error } = await supabase
        .from('jobs')
        .update({
          ...payload,
          status: 'draft',
          expires_at: null,
          is_featured: false,
          pending_changes: null,
          pending_review_status: 'none',
          pending_rejection_reason: null,
          pending_submitted_at: null,
        })
        .eq('id', jobId)
      if (error) {
        logJobError('unpublish', error)
        return { error: error.message }
      }
      revalidatePath(`/${locale}/dashboard/company-jobs`)
      revalidateJobsListingCache()
      return { success: true, jobId }
    }

    // Report BS-53: editing an already-LIVE job does not go live immediately.
    // The change is held as pending_changes and the approved version keeps
    // serving until an admin approves.
    if (transition === 'pending_edit') {
      const { status: _drop, ...pendingFields } = payload as Record<string, unknown>
      const { error } = await supabase
        .from('jobs')
        .update({
          pending_changes: pendingFields,
          pending_review_status: 'pending',
          pending_rejection_reason: null,
          pending_submitted_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      if (error) {
        logJobError('update-pending', error)
        return { error: error.message }
      }
      revalidatePath(`/${locale}/dashboard/company-jobs`)
      return { success: true, jobId, pendingReview: true }
    }

    // BS-103: REPUBLISHING a job that was live before goes through approval —
    // the text may have changed while it sat in draft. It stays a private draft
    // until an admin approves; the requested publication rides in pending_changes.
    if (transition === 'pending_republish') {
      const monthly = await getJobPublishAllowance(userId)
      if (!monthly.allowed) return { error: 'monthly_limit_reached' }

      const { status: _drop, expires_at: _exp, published_at: _pub, ...pendingFields } =
        payload as Record<string, unknown>
      const { error } = await supabase
        .from('jobs')
        .update({
          ...pendingFields,
          status: 'draft',
          pending_changes: { ...pendingFields, status: 'active', republish: true },
          pending_review_status: 'pending',
          pending_rejection_reason: null,
          pending_submitted_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      if (error) {
        logJobError('republish-pending', error)
        return { error: error.message }
      }
      revalidatePath(`/${locale}/dashboard/company-jobs`)
      return { success: true, jobId, pendingReview: true }
    }

    // A draft that was never public edits (and publishes) directly.
    if (status === 'active') {
      const monthly = await getJobPublishAllowance(userId)
      if (!monthly.allowed) return { error: 'monthly_limit_reached' }
    }
    const { error } = await supabase.from('jobs').update(payload).eq('id', jobId)
    if (error) {
      logJobError('update', error)
      return { error: error.message }
    }

    revalidatePath(`/${locale}/dashboard/company-jobs`)
    revalidateJobsListingCache()
    return { success: true, jobId }
  }

  // Enforce the subscription plan's active-job quota on NEW published jobs (BS-15).
  if (status === 'active') {
    const [quota, activeCount] = await Promise.all([
      getEffectiveJobQuota(userId),
      countActiveCompanyJobs(userId),
    ])
    if (activeCount >= quota) {
      return { error: 'quota_reached' }
    }
    // Round 9: and the plan's MONTHLY publish cap (Free 1 / Pro 10 / Enterprise ∞).
    const monthly = await getJobPublishAllowance(userId)
    if (!monthly.allowed) {
      return { error: 'monthly_limit_reached' }
    }
  }

  const { data: created, error } = await supabase
    .from('jobs')
    .insert({ ...payload, posted_by: userId, admin_id: null })
    .select('id')
    .single()

  if (error) {
    logJobError('insert', error)
    return { error: error.message }
  }

  revalidatePath(`/${locale}/dashboard/company-jobs`)
  revalidateJobsListingCache()
  return { success: true, jobId: created?.id as string }
}

/** Renew an expiring/expired company job — restart the 30-day window (BS-16). */
export async function renewCompanyJob(
  jobId: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const userId = await verifyCompanyRep()
  if (!userId) return { error: 'unauthorized' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('jobs')
    .select('id, posted_by')
    .eq('id', jobId)
    .maybeSingle()

  if (!existing || existing.posted_by !== userId) return { error: 'not_found' }

  // Renewing re-lists the job, so it counts against the plan quota (BS-15).
  const [quota, activeCount] = await Promise.all([
    getEffectiveJobQuota(userId),
    countActiveCompanyJobs(userId),
  ])
  if (activeCount >= quota) {
    return { error: 'quota_reached' }
  }
  const monthly = await getJobPublishAllowance(userId)
  if (!monthly.allowed) {
    return { error: 'monthly_limit_reached' }
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'active',
      expires_at: jobExpiryFromNow(),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    logJobError('renew', error)
    return { error: error.message }
  }

  revalidatePath(`/${locale}/dashboard/company-jobs`)
  revalidateJobsListingCache()
  return { success: true }
}

export async function getCompanyJobs(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('posted_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[company/jobs] list failed:', error)
    return []
  }
  return data ?? []
}

export async function getCompanyJobForEdit(jobId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('posted_by', userId)
    .maybeSingle()

  return data
}
