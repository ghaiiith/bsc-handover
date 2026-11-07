import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getJobRecommendations } from '@/lib/candidates/recommend-for-job'
import type { HrCandidate } from '@/lib/hr-chat/candidate-filters'
import type { ExperienceItem } from '@/types/profile'

/**
 * Round 9 (BS-108): everything the HR chatbot is allowed to know.
 *
 * The data boundary is the job. This module loads ONE job, verifies the caller
 * owns it, and returns only that job's applicants plus the suggested
 * candidates the matching engine already computed for it. Nothing here takes a
 * company id as a filter — ownership is checked, then the job id scopes every
 * query — so a request for another company's job stops at the first line.
 */

export interface HrJobDataset {
  job: {
    id: string
    title: string
    titleAr: string
    skills: string[]
    city: string | null
    jobType: string | null
    description: string
  }
  candidates: HrCandidate[]
  counts: { applicants: number; suggested: number }
}

export type DatasetError = 'not_found' | 'forbidden'

export async function loadHrJobDataset(
  jobId: string,
  viewerId: string
): Promise<{ ok: true; data: HrJobDataset } | { ok: false; error: DatasetError }> {
  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('id, title, title_ar, skills, city, job_type, description, description_ar, posted_by, admin_id')
    .eq('id', jobId)
    .maybeSingle()
  if (!job) return { ok: false, error: 'not_found' }

  const { data: viewer } = await admin.from('users').select('role').eq('id', viewerId).maybeSingle()
  const owns = job.posted_by === viewerId || job.admin_id === viewerId
  if (!owns && viewer?.role !== 'admin') return { ok: false, error: 'forbidden' }

  // Applicants — the people who actually applied to THIS job.
  const { data: apps } = await admin
    .from('job_applications')
    .select(
      'id, status, applicant:users!applicant_id(id, full_name, full_name_ar, headline, skills, experience, education, location, years_of_experience, expected_salary_amount, expected_salary_currency, expected_salary_period, expected_salary_public)'
    )
    .eq('job_id', jobId)

  const candidates: HrCandidate[] = []
  const seen = new Set<string>()

  for (const row of apps ?? []) {
    const a = (Array.isArray(row.applicant) ? row.applicant[0] : row.applicant) as
      | Record<string, unknown>
      | null
    if (!a) continue
    const id = a.id as string
    seen.add(id)
    candidates.push({
      id,
      name: (a.full_name_ar as string) || (a.full_name as string) || '—',
      headline: (a.headline as string) ?? null,
      skills: Array.isArray(a.skills) ? (a.skills as string[]) : [],
      experience: Array.isArray(a.experience) ? (a.experience as ExperienceItem[]) : [],
      education: Array.isArray(a.education) ? (a.education as HrCandidate['education']) : [],
      yearsOfExperience: (a.years_of_experience as number | null) ?? null,
      location: (a.location as string) ?? null,
      // Salary only if the candidate chose to share it (BS-65).
      expectedSalary:
        a.expected_salary_public !== false && typeof a.expected_salary_amount === 'number'
          ? {
              amount: a.expected_salary_amount as number,
              currency: (a.expected_salary_currency as string) ?? 'IQD',
              period: (a.expected_salary_period as string) ?? 'monthly',
            }
          : null,
      applicationStatus: (row.status as string) ?? null,
      source: 'applicant',
    })
  }

  // Suggested candidates the matching engine already ranked for this job.
  // Only platform users (with a profile we can read) — imported CV rows carry
  // no structured experience and would give the chatbot nothing to reason on.
  let suggestedCount = 0
  try {
    const recs = await getJobRecommendations(jobId)
    for (const c of recs.candidates) {
      if (!c.userId || seen.has(c.userId)) continue
      const { data: u } = await admin
        .from('users')
        .select('id, full_name, full_name_ar, headline, skills, experience, education, location, years_of_experience')
        .eq('id', c.userId)
        .maybeSingle()
      if (!u) continue
      seen.add(u.id as string)
      suggestedCount += 1
      candidates.push({
        id: u.id as string,
        name: (u.full_name_ar as string) || (u.full_name as string) || c.name,
        headline: (u.headline as string) ?? c.headline,
        skills: Array.isArray(u.skills) ? (u.skills as string[]) : [],
        experience: Array.isArray(u.experience) ? (u.experience as ExperienceItem[]) : [],
        education: Array.isArray(u.education) ? (u.education as HrCandidate['education']) : [],
        yearsOfExperience: (u.years_of_experience as number | null) ?? null,
        location: (u.location as string) ?? c.location,
        expectedSalary: null,
        matchScore: c.score,
        source: 'suggested',
      })
    }
  } catch {
    // Suggestions are additive; the applicants alone are a valid dataset.
  }

  return {
    ok: true,
    data: {
      job: {
        id: job.id as string,
        title: job.title as string,
        titleAr: (job.title_ar as string) ?? (job.title as string),
        skills: Array.isArray(job.skills) ? (job.skills as string[]) : [],
        city: (job.city as string) ?? null,
        jobType: (job.job_type as string) ?? null,
        description: ((job.description_ar as string) || (job.description as string) || '').slice(0, 1500),
      },
      candidates,
      counts: { applicants: apps?.length ?? 0, suggested: suggestedCount },
    },
  }
}
