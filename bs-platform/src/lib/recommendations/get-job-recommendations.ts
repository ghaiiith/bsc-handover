import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  isLearningAssistantConfigured,
  recommendJobs,
} from '@/lib/ai/learning-assistant-server'
import { buildAssistantStudent } from '@/lib/ai/learning-assistant-data'
import type { Job } from '@/types'

/**
 * "Suggested jobs" for the /jobs page — the jobs-side twin of
 * getCourseRecommendations.
 *
 * Ranking runs through the learning_assistant service (the CV-builder path the
 * course recommender uses is currently unfunded), and degrades to a skills
 * overlap score so the section still has something to show. Either way, jobs
 * posted on the platform outrank channel imports: there are only a handful of
 * them against thousands of imports, and they are the ones the platform can
 * actually take an application for.
 */

export interface JobRecommendation {
  job: Job
  reason: string
  matchPercent?: number
}

export interface JobRecommendationResult {
  jobs: JobRecommendation[]
  isFallback: boolean
}

const CANDIDATE_POOL = 120
const RESULT_COUNT = 6

const JOB_SELECT = `
  id, admin_id, title, title_ar, company_name, city, job_type,
  salary_min, salary_max, currency, skills, description, description_ar,
  deadline, status, is_external, created_at, updated_at
`

/** Active, unexpired jobs, platform posts first so they survive the pool cap. */
async function fetchCandidateJobs(): Promise<Job[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('is_external', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_POOL)

  return (data ?? []) as unknown as Job[]
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Count how many of the seeker's skills the listing asks for. */
export function countSkillOverlap(jobSkills: string[], userSkills: string[]): number {
  if (jobSkills.length === 0 || userSkills.length === 0) return 0
  const wanted = new Set(jobSkills.map(normalize))
  return userSkills.filter((s) => wanted.has(normalize(s))).length
}

/**
 * Order jobs when no AI ranking is available. Platform posts first, then skill
 * overlap, then city match, then recency.
 */
export function rankJobsByOverlap(
  jobs: Job[],
  userSkills: string[],
  city?: string | null
): Job[] {
  return [...jobs].sort((a, b) => {
    const platform = Number(Boolean(a.is_external)) - Number(Boolean(b.is_external))
    if (platform !== 0) return platform

    const overlap =
      countSkillOverlap(b.skills ?? [], userSkills) -
      countSkillOverlap(a.skills ?? [], userSkills)
    if (overlap !== 0) return overlap

    if (city) {
      const cityMatch = Number(b.city === city) - Number(a.city === city)
      if (cityMatch !== 0) return cityMatch
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/** Keep every platform job ahead of the imports the ranker interleaved. */
export function platformFirst(jobs: Job[]): Job[] {
  return [
    ...jobs.filter((j) => !j.is_external),
    ...jobs.filter((j) => j.is_external),
  ]
}

function buildReason(
  job: Job,
  userSkills: string[],
  locale: string,
  aiReasons?: string[]
): string {
  const isAr = locale === 'ar'
  const aiReason = aiReasons?.find((r) => r?.trim())
  if (aiReason) return aiReason

  const matched = (job.skills ?? []).filter((s) =>
    userSkills.some((u) => normalize(u) === normalize(s))
  )
  if (matched.length > 0) {
    return isAr
      ? `يطابق مهاراتك: ${matched.slice(0, 3).join('، ')}`
      : `Matches your skills: ${matched.slice(0, 3).join(', ')}`
  }
  if (!job.is_external) {
    return isAr ? 'وظيفة منشورة على المنصة' : 'Posted on the platform'
  }
  return isAr ? 'فرصة جديدة قد تناسبك' : 'A new opening that may suit you'
}

export async function getJobRecommendations(
  userId: string,
  locale: string
): Promise<JobRecommendationResult> {
  const supabase = await createClient()

  // Own-row read via RPC, matching the course recommender.
  const { data: rpcData } = await supabase.rpc('get_my_profile')
  const profile = Array.isArray(rpcData) ? rpcData[0] : rpcData
  const userSkills = ((profile?.skills as string[]) ?? []).filter(Boolean)
  const city = (profile?.city as string) ?? null

  const candidates = await fetchCandidateJobs()
  if (candidates.length === 0) return { jobs: [], isFallback: false }

  const byId = new Map(candidates.map((j) => [j.id, j]))
  const aiReasons = new Map<string, string[]>()
  const matchPercents = new Map<string, number>()
  let ordered: Job[] | null = null

  if (isLearningAssistantConfigured()) {
    const student = await buildAssistantStudent(userId).catch(() => undefined)
    const ranked = await recommendJobs({
      student: student ?? {},
      jobs: candidates.map((j) => ({
        id: j.id,
        title: (locale === 'ar' ? j.title_ar : j.title) || j.title,
        company: j.company_name ?? undefined,
        city: j.city ?? undefined,
        job_type: j.job_type ?? undefined,
        required_skills: j.skills ?? [],
      })),
      limit: RESULT_COUNT * 3,
    })

    if (ranked?.ok && ranked.results?.length) {
      for (const r of ranked.results) {
        if (r.reasons?.length) aiReasons.set(r.id, r.reasons)
        if (typeof r.match_percent === 'number') matchPercents.set(r.id, r.match_percent)
      }
      const hits = ranked.results
        .map((r) => byId.get(r.id))
        .filter((j): j is Job => Boolean(j))
      if (hits.length > 0) ordered = platformFirst(hits)
    }
  }

  const isFallback = ordered === null
  const finalList = (ordered ?? rankJobsByOverlap(candidates, userSkills, city)).slice(
    0,
    RESULT_COUNT
  )

  return {
    isFallback,
    jobs: finalList.map((job) => ({
      job,
      reason: buildReason(job, userSkills, locale, aiReasons.get(job.id)),
      matchPercent: matchPercents.get(job.id),
    })),
  }
}
