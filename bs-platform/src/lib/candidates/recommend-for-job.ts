import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildJobDescriptionString } from '@/lib/admin/candidates/build-candidate'
import { isCvBuilderConfigured, rankCandidatesWithJob } from '@/lib/cv/cv-builder-server'
import type { ResumeInput } from '@/types/cv'
import type { Job } from '@/types'

/**
 * Report BS-39: rank the CVs held on the platform against one job, for the
 * employer's job card. The pool is both sources of real CVs:
 *   - cv_profiles — CVs users built here
 *   - candidates  — CVs imported in bulk from a folder (report BS-40)
 *
 * Scoring uses the CV Builder `/rank` endpoint (see docs/ai-services.md). If it
 * is unreachable, a deterministic skills-overlap score is used instead so the
 * employer still gets a ranked list, flagged with `isFallback`.
 */

const POOL_LIMIT = 120
const TOP_RESULTS = 12

export interface RecommendedCandidate {
  id: string
  source: 'platform_cv' | 'imported_cv'
  name: string
  headline: string
  location: string
  score: number
  /** The "why": job terms this CV covers, and the notable ones it does not. */
  matchedKeywords: string[]
  missingKeywords: string[]
  /** Public portfolio of the platform user behind this CV, when there is one. */
  profileSlug: string | null
  userId: string | null
  cvUrl: string | null
}

export interface JobRecommendations {
  candidates: RecommendedCandidate[]
  totalPool: number
  isFallback: boolean
  analyzedAt: string
}

interface PoolEntry {
  id: string
  source: 'platform_cv' | 'imported_cv'
  resume: ResumeInput
  name: string
  headline: string
  location: string
  skills: string[]
  profileSlug: string | null
  userId: string | null
  cvUrl: string | null
}

function resumeSkills(resume: ResumeInput): string[] {
  return (resume.skills ?? [])
    .flatMap((s) => [s.name, ...(s.keywords ?? [])])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
}

async function fetchPlatformCvPool(): Promise<PoolEntry[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('cv_profiles')
    .select('id, user_id, resume_data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(POOL_LIMIT)

  const rows = (data ?? []) as Array<{
    id: string
    user_id: string
    resume_data: ResumeInput | null
  }>
  if (rows.length === 0) return []

  // One entry per user — their most recently updated CV.
  const byUser = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, row)
  }

  const userIds = [...byUser.keys()]
  const { data: users } = await admin
    .from('users')
    .select('id, full_name, full_name_ar, headline, location, portfolio_slug, is_active, availability')
    .in('id', userIds)

  const userMap = new Map(
    ((users ?? []) as Array<{
      id: string
      full_name: string | null
      full_name_ar: string | null
      headline: string | null
      location: string | null
      portfolio_slug: string | null
      is_active: boolean
      availability: boolean | null
    }>).map((u) => [u.id, u])
  )

  const entries: PoolEntry[] = []
  for (const [userId, row] of byUser) {
    const user = userMap.get(userId)
    // Report BS-61: only suggest candidates who are open to work. availability
    // is filtered here in the pool build, not in the display layer.
    if (!user || user.is_active === false || user.availability === false) continue
    const resume = row.resume_data
    if (!resume) continue

    entries.push({
      id: `cv:${row.id}`,
      source: 'platform_cv',
      resume,
      name: resume.basics?.name?.trim() || user.full_name?.trim() || user.full_name_ar?.trim() || '—',
      headline: resume.basics?.label?.trim() || user.headline?.trim() || '',
      location: resume.basics?.location?.city?.trim() || user.location?.trim() || '',
      skills: resumeSkills(resume),
      profileSlug: user.portfolio_slug,
      userId,
      cvUrl: null,
    })
  }

  return entries
}

async function fetchImportedCvPool(): Promise<PoolEntry[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('candidates')
    .select('id, full_name, headline, location, skills, resume, cv_url, user_id')
    .order('created_at', { ascending: false })
    .limit(POOL_LIMIT)

  const rows = (data ?? []) as Array<{
    id: string
    full_name: string | null
    headline: string | null
    location: string | null
    skills: string[] | null
    resume: ResumeInput | null
    cv_url: string | null
    user_id: string | null
  }>

  // Report BS-61/83: an imported CV that belongs to a platform user who marked
  // themselves NOT open to work must not be suggested either.
  const linkedIds = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v))
  const unavailable = new Set<string>()
  if (linkedIds.length > 0) {
    const { data: linked } = await admin
      .from('users')
      .select('id, availability, is_active')
      .in('id', linkedIds)
    for (const u of linked ?? []) {
      if (u.availability === false || u.is_active === false) unavailable.add(u.id as string)
    }
  }

  return rows
    .filter((row) => row.resume && !(row.user_id && unavailable.has(row.user_id)))
    .map((row) => ({
      id: `cand:${row.id}`,
      source: 'imported_cv' as const,
      resume: row.resume as ResumeInput,
      name: row.full_name?.trim() || '—',
      headline: row.headline?.trim() || '',
      location: row.location?.trim() || '',
      skills: row.skills ?? resumeSkills(row.resume as ResumeInput),
      profileSlug: null,
      userId: row.user_id,
      cvUrl: row.cv_url,
    }))
}

/** Deterministic skills-overlap scoring, used when the AI service is down. */
function fallbackScore(
  entry: PoolEntry,
  jobSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  const wanted = jobSkills.map((s) => s.toLowerCase().trim()).filter(Boolean)
  if (wanted.length === 0) return { score: 0, matched: [], missing: [] }

  const have = new Set(entry.skills.map((s) => s.toLowerCase()))
  const matched = wanted.filter((w) => [...have].some((h) => h.includes(w) || w.includes(h)))
  const missing = wanted.filter((w) => !matched.includes(w))

  return {
    score: Math.round((matched.length / wanted.length) * 100),
    matched,
    missing,
  }
}


/**
 * Report BS-63: what happened the last time an employer actually contacted this
 * candidate feeds the NEXT ranking. A candidate who answered and was interested
 * rises; one who could not be reached, had a wrong number, or said they were not
 * interested sinks — so employers stop being sent at the same dead ends.
 */
const OUTCOME_WEIGHTS: Record<string, number> = {
  available_interested: 8,
  contact_later: 0,
  available_not_interested: -10,
  no_answer: -6,
  wrong_number: -15,
  salary_too_high: -4,
  employed_elsewhere: -25,
}

async function fetchContactSignals(userIds: string[]): Promise<Map<string, number>> {
  const signals = new Map<string, number>()
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return signals

  const admin = createAdminClient()
  const { data } = await admin
    .from('job_applications')
    .select('applicant_id, contact_outcome, contacted_at')
    .in('applicant_id', ids)
    .not('contact_outcome', 'is', null)
    .order('contacted_at', { ascending: false })
    .limit(500)

  // Only the most recent outcome per candidate counts.
  const seen = new Set<string>()
  for (const row of data ?? []) {
    const uid = row.applicant_id as string
    if (seen.has(uid)) continue
    seen.add(uid)
    const weight = OUTCOME_WEIGHTS[row.contact_outcome as string]
    if (weight) signals.set(uid, weight)
  }
  return signals
}

export async function computeJobRecommendations(jobId: string): Promise<JobRecommendations> {
  const admin = createAdminClient()
  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job) throw new Error('job_not_found')

  const jobRecord = job as Job
  const jobDescription = buildJobDescriptionString(jobRecord)

  const [platform, imported] = await Promise.all([fetchPlatformCvPool(), fetchImportedCvPool()])
  const pool = [...platform, ...imported].slice(0, POOL_LIMIT)

  if (pool.length === 0) {
    return { candidates: [], totalPool: 0, isFallback: false, analyzedAt: new Date().toISOString() }
  }

  let isFallback = true
  const scores = new Map<string, { score: number; matched: string[]; missing: string[] }>()

  if (isCvBuilderConfigured()) {
    const result = await rankCandidatesWithJob(
      jobDescription,
      pool.map((entry) => ({ id: entry.id, resume: entry.resume }))
    )
    if (result.ok) {
      isFallback = false
      for (const item of result.items) {
        scores.set(item.id, {
          score: item.score,
          matched: item.matched_skills,
          missing: item.missing_skills,
        })
      }
    }
  }

  if (isFallback) {
    for (const entry of pool) {
      scores.set(entry.id, fallbackScore(entry, jobRecord.skills ?? []))
    }
  }

  // Report BS-63: adjust by the recorded contact outcome before sorting.
  const contactSignals = await fetchContactSignals(
    pool.map((e) => e.userId).filter((v): v is string => Boolean(v))
  )

  const candidates = pool
    .map((entry) => {
      const s = scores.get(entry.id) ?? { score: 0, matched: [], missing: [] }
      const signal = entry.userId ? contactSignals.get(entry.userId) ?? 0 : 0
      return {
        id: entry.id,
        source: entry.source,
        name: entry.name,
        headline: entry.headline,
        location: entry.location,
        score: Math.max(0, Math.min(100, s.score + signal)),
        matchedKeywords: s.matched.slice(0, 8),
        missingKeywords: s.missing.slice(0, 6),
        profileSlug: entry.profileSlug,
        userId: entry.userId,
        cvUrl: entry.cvUrl,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_RESULTS)

  return {
    candidates,
    totalPool: pool.length,
    isFallback,
    analyzedAt: new Date().toISOString(),
  }
}

export function getJobRecommendationsCacheTag(jobId: string): string {
  return `job-recommendations-${jobId}`
}

/**
 * Report BS-83: a shared tag on EVERY job's recommendation cache so a candidate
 * changing their availability invalidates all employer suggestion lists at once
 * (per-job tags alone can't be busted without knowing every job id).
 */
export const JOB_RECOMMENDATIONS_SHARED_TAG = 'job-recommendations'

/** Cached for 15 minutes — ranking is a paid model call. */
export async function getJobRecommendations(jobId: string): Promise<JobRecommendations> {
  const cached = unstable_cache(
    () => computeJobRecommendations(jobId),
    [`job-recommendations-${jobId}`],
    {
      revalidate: 900,
      tags: [getJobRecommendationsCacheTag(jobId), JOB_RECOMMENDATIONS_SHARED_TAG],
    }
  )
  return cached()
}
