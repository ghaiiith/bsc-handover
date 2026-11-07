'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import {
  APPLICATION_STATUSES,
  CONTACT_OUTCOMES,
  type ApplicationStatusValue,
  type ContactOutcomeValue,
} from '@/lib/jobs/application-constants'

export interface ApplyInput {
  cvUrl: string
  coverLetter?: string
}

export interface MyApplication {
  id: string
  status: string
  applied_at: string
  cover_letter: string | null
  job: {
    id: string
    title: string
    title_ar: string | null
    company_name: string | null
    city: string | null
  } | null
}

export interface JobApplicant {
  id: string
  status: string
  applied_at: string
  cv_url: string
  cover_letter: string | null
  contact_outcome: string | null
  contact_note: string | null
  applicant: {
    id: string
    full_name: string | null
    full_name_ar: string | null
    avatar_url: string | null
    headline: string | null
    portfolio_slug: string | null
    // Report BS-65: shown to the employer only when the candidate allows it.
    expected_salary_amount: number | null
    expected_salary_currency: string | null
    expected_salary_period: string | null
    expected_salary_public: boolean | null
  } | null
}

const HTTP_URL = /^https?:\/\/.+/i

export async function applyToJobAction(
  jobId: string,
  input: ApplyInput,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'not_authenticated' }

  // Report BS-62/79: externally-sourced jobs never receive platform applications —
  // reject server-side so an application can't be created from a stale page or a
  // direct POST and then silently vanish.
  const { data: jobRow } = await supabase
    .from('jobs')
    .select('is_external')
    .eq('id', jobId)
    .maybeSingle()
  if (jobRow?.is_external) return { success: false, error: 'external_job' }

  const cvUrl = input.cvUrl.trim()
  if (!HTTP_URL.test(cvUrl)) return { success: false, error: 'invalid_cv_url' }
  const coverLetter = input.coverLetter?.trim().slice(0, 2000) || null

  const { error } = await supabase.from('job_applications').insert({
    job_id: jobId,
    applicant_id: user.id,
    cv_url: cvUrl,
    cover_letter: coverLetter,
    status: 'submitted',
  })

  if (error) {
    // Unique violation → already applied.
    if (error.code === '23505') return { success: false, error: 'already_applied' }
    return { success: false, error: error.message }
  }

  // Notify the job poster (best-effort, via service role to read poster + name).
  void notifyPoster(jobId, user.id)

  revalidatePath(`/${locale}/jobs/${jobId}`)
  revalidatePath(`/${locale}/dashboard/my-applications`)
  return { success: true }
}

async function notifyPoster(jobId: string, applicantId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: job } = await admin
      .from('jobs')
      .select('posted_by, title, title_ar')
      .eq('id', jobId)
      .maybeSingle()
    if (!job?.posted_by) return
    await createNotification({
      userId: job.posted_by as string,
      title: 'New job application',
      titleAr: 'طلب توظيف جديد',
      body: `A candidate applied to "${job.title}".`,
      bodyAr: `تقدّم مرشّح إلى وظيفة "${job.title_ar ?? job.title}".`,
      type: `job_application:${jobId}`,
    })
  } catch {
    // non-fatal
  }
}

export async function hasUserApplied(jobId: string): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('applicant_id', user.id)
    .maybeSingle()
  return Boolean(data)
}

export async function getMyApplications(userId: string): Promise<MyApplication[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('job_applications')
    .select(
      'id, status, applied_at, cover_letter, job:jobs(id, title, title_ar, company_name, city)'
    )
    .eq('applicant_id', userId)
    .order('applied_at', { ascending: false })

  return ((data ?? []) as unknown as MyApplication[]).map((row) => ({
    ...row,
    job: Array.isArray(row.job) ? row.job[0] ?? null : row.job,
  }))
}

/**
 * Applicants for a job — for the job poster or an admin.
 *
 * Report BS-100: applications submitted from another account were invisible to
 * the employer. The cause was NOT the application record — it was this query.
 * `public.users` carries COLUMN-level grants, and the `expected_salary_*`
 * columns added in BS-65 were never added to the `authenticated` allowlist, so
 * PostgREST rejected the whole select with `42501 permission denied for table
 * users`. The old code destructured only `data`, so the error vanished and an
 * empty list rendered as "no applicants".
 *
 * The fix reads through the service role AFTER verifying that the viewer owns
 * the job (or is an admin) — the same ownership rule RLS enforced, checked
 * explicitly — and strips the salary fields when the candidate opted out, so
 * granting those columns platform-wide is not required.
 */
export async function getJobApplicants(
  jobId: string,
  viewerId?: string
): Promise<JobApplicant[]> {
  const admin = createAdminClient()

  const viewer = viewerId ?? (await getSessionUserId())
  if (!viewer) return []

  const [{ data: job }, { data: profile }] = await Promise.all([
    admin.from('jobs').select('posted_by, admin_id').eq('id', jobId).maybeSingle(),
    admin.from('users').select('role').eq('id', viewer).maybeSingle(),
  ])

  const isAdmin = profile?.role === 'admin'
  const owns = job?.posted_by === viewer || job?.admin_id === viewer
  if (!job || (!owns && !isAdmin)) return []

  const { data, error } = await admin
    .from('job_applications')
    .select(
      'id, status, applied_at, cv_url, cover_letter, contact_outcome, contact_note, applicant:users!applicant_id(id, full_name, full_name_ar, avatar_url, headline, portfolio_slug, expected_salary_amount, expected_salary_currency, expected_salary_period, expected_salary_public)'
    )
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false })

  if (error) {
    // Loud on purpose: this is the failure mode that looked like "no applicants".
    console.error('[applications] applicant read failed:', error.message)
    throw new Error(`applicants_read_failed: ${error.message}`)
  }

  return ((data ?? []) as unknown as JobApplicant[]).map((row) => {
    const applicant = Array.isArray(row.applicant) ? row.applicant[0] ?? null : row.applicant
    return {
      ...row,
      applicant: applicant ? redactPrivateSalary(applicant) : null,
    }
  })
}

/** Report BS-65: an opted-out candidate's salary never leaves the server. */
function redactPrivateSalary<T extends { expected_salary_public?: boolean | null }>(
  applicant: T
): T {
  if (applicant.expected_salary_public !== false) return applicant
  return {
    ...applicant,
    expected_salary_amount: null,
    expected_salary_currency: null,
    expected_salary_period: null,
  }
}

async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Report BS-66: applications are managed by status, never deleted. The job poster
 * (or admin) moves an application through its lifecycle. RLS
 * (job_apps_poster_update) already restricts this to the job owner.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatusValue,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!APPLICATION_STATUSES.includes(status)) return { error: 'invalid_status' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const { data, error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('id', applicationId)
    .select('id, job_id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'not_found' } // RLS blocked (not the poster)

  revalidatePath(`/${locale}/dashboard/company-jobs/${data.job_id}/applicants`)
  return { success: true }
}

/**
 * Report BS-63: the employer records what happened after contacting a candidate.
 * Sets status to 'contacted', stores the outcome + optional note, and feeds the
 * strong "employed elsewhere" signal back into the candidate's availability so
 * future matching (BS-61) stops surfacing someone who is no longer available.
 */
export async function recordContactOutcome(
  applicationId: string,
  outcome: ContactOutcomeValue,
  note: string | undefined,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!CONTACT_OUTCOMES.includes(outcome)) return { error: 'invalid_outcome' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const { data, error } = await supabase
    .from('job_applications')
    .update({
      status: 'contacted',
      contact_outcome: outcome,
      contact_note: note?.trim() ? note.trim().slice(0, 1000) : null,
      contacted_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select('id, job_id, applicant_id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'not_found' }

  // Strong signal only: a candidate reported as employed elsewhere is marked not
  // open to work (admin client — this is a cross-user write).
  if (outcome === 'employed_elsewhere' && data.applicant_id) {
    const admin = createAdminClient()
    await admin.from('users').update({ availability: false }).eq('id', data.applicant_id)
    // Report BS-83: availability changes must not sit behind a cached list.
    revalidateTag('community-members', 'max')
    revalidateTag('job-recommendations', 'max')
  }

  revalidatePath(`/${locale}/dashboard/company-jobs/${data.job_id}/applicants`)
  return { success: true }
}
