import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCandidateForRanking, buildJobDescriptionString } from '@/lib/admin/candidates/build-candidate'
import { fallbackRankCandidates, type FallbackRankInput } from '@/lib/admin/candidates/fallback-rank'
import { isCvBuilderConfigured, rankCandidatesWithJob } from '@/lib/cv/cv-builder-server'
import type { CandidateRankResponse, RankedCandidate } from '@/types/candidates'
import type { EducationItem, ExperienceItem, ProjectItem } from '@/types/profile'
import type { Job } from '@/types'
import type { ResumeInput } from '@/types/cv'

const MAX_CANDIDATES = 100
const TOP_RESULTS = 20

interface CandidateRow {
  id: string
  email: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
  skills?: string[] | null
  experience?: ExperienceItem[] | null
  education?: EducationItem[] | null
  projects?: ProjectItem[] | null
  preferred_role?: string | null
  location?: string | null
  years_of_experience?: number | null
  availability?: boolean | null
  profile_completed_at?: string | null
  created_at: string
}

function candidateToResume(candidate: ReturnType<typeof buildCandidateForRanking>): ResumeInput {
  return {
    basics: {
      name: candidate.name,
      label: candidate.headline,
      location: candidate.location ? { city: candidate.location } : undefined,
    },
    skills: candidate.skills.map((s) => ({ name: s })),
    work: candidate.experience_titles.map((t) => ({ position: t })),
  }
}

function toRankedCandidate(
  row: CandidateRow,
  hasCvProfile: boolean,
  scores: { matchScore: number; matchedSkills: string[]; missingSkills: string[] }
): RankedCandidate {
  return {
    userId: row.id,
    name: row.full_name?.trim() || row.full_name_ar?.trim() || '—',
    headline: row.headline?.trim() || '',
    location: row.location?.trim() || '',
    skills: (row.skills ?? []).map((s) => s.trim()).filter(Boolean),
    matchScore: scores.matchScore,
    matchedSkills: scores.matchedSkills,
    missingSkills: scores.missingSkills,
    yearsExperience: row.years_of_experience ?? 0,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    availability: Boolean(row.availability),
    hasCvProfile,
    experience: (row.experience as ExperienceItem[]) ?? [],
    education: (row.education as EducationItem[]) ?? [],
    projects: (row.projects as ProjectItem[]) ?? [],
  }
}

export async function countEligibleCandidates(): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('users')
    .select('skills')
    .in('role', ['student', 'instructor'])
    .eq('is_active', true)

  return (data ?? []).filter((u) => (u.skills?.length ?? 0) >= 1).length
}

async function fetchCandidatePool(): Promise<{ rows: CandidateRow[]; totalEligible: number }> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('users')
    .select(
      'id, email, full_name, full_name_ar, avatar_url, headline, skills, experience, education, projects, preferred_role, location, years_of_experience, availability, profile_completed_at, created_at'
    )
    .in('role', ['student', 'instructor'])
    .eq('is_active', true)
    // Report BS-61/83: never rank candidates who marked themselves NOT open to
    // work — filtered in the query, like the employer-facing pool.
    .not('availability', 'is', false)
    .order('profile_completed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500)

  const eligible = ((data ?? []) as CandidateRow[]).filter((u) => (u.skills?.length ?? 0) >= 1)
  return {
    rows: eligible.slice(0, MAX_CANDIDATES),
    totalEligible: eligible.length,
  }
}

async function fetchCvProfileUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()
  const supabase = createAdminClient()
  const { data } = await supabase.from('cv_profiles').select('user_id').in('user_id', userIds)
  return new Set((data ?? []).map((r) => r.user_id as string))
}

export async function computeRankForJob(jobId: string): Promise<CandidateRankResponse> {
  const supabase = createAdminClient()

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    throw new Error('job_not_found')
  }

  const jobRecord = job as Job
  const jobDescription = buildJobDescriptionString(jobRecord)
  const jobTitle = jobRecord.title_ar?.trim() || jobRecord.title?.trim() || ''

  const { rows, totalEligible } = await fetchCandidatePool()
  const cvUserIds = await fetchCvProfileUserIds(rows.map((r) => r.id))

  const fallbackInputs: FallbackRankInput[] = rows.map((row) => {
    const built = buildCandidateForRanking(row)
    return {
      ...built,
      email: row.email,
      avatarUrl: row.avatar_url ?? undefined,
      availability: Boolean(row.availability),
      hasCvProfile: cvUserIds.has(row.id),
      experience: (row.experience as ExperienceItem[]) ?? [],
      education: (row.education as EducationItem[]) ?? [],
      projects: (row.projects as ProjectItem[]) ?? [],
    }
  })

  let isFallback = false
  let scoreMap = new Map<string, { matchScore: number; matchedSkills: string[]; missingSkills: string[] }>()

  if (isCvBuilderConfigured() && rows.length > 0) {
    const candidates = rows.map((row) => ({
      id: row.id,
      resume: candidateToResume(buildCandidateForRanking(row)),
    }))

    const rankResult = await rankCandidatesWithJob(jobDescription, candidates)
    if (rankResult.ok) {
      for (const item of rankResult.items) {
        scoreMap.set(item.id, {
          matchScore: item.score,
          matchedSkills: item.matched_skills,
          missingSkills: item.missing_skills,
        })
      }
    } else {
      isFallback = true
    }
  } else {
    isFallback = true
  }

  if (isFallback) {
    const fallbackResults = fallbackRankCandidates(fallbackInputs, jobRecord.skills ?? [])
    scoreMap = new Map(
      fallbackResults.map((r) => [
        r.userId,
        { matchScore: r.matchScore, matchedSkills: r.matchedSkills, missingSkills: r.missingSkills },
      ])
    )
  }

  const ranked = rows
    .map((row) => {
      const scores = scoreMap.get(row.id) ?? {
        matchScore: 0,
        matchedSkills: [] as string[],
        missingSkills: jobRecord.skills ?? [],
      }
      return toRankedCandidate(row, cvUserIds.has(row.id), scores)
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, TOP_RESULTS)

  return {
    candidates: ranked,
    totalScanned: rows.length,
    totalEligible,
    jobTitle,
    isFallback,
    analyzedAt: new Date().toISOString(),
  }
}

export function getCandidateRankCacheTag(jobId: string): string {
  return `candidates-rank-${jobId}`
}

export async function getRankedCandidatesForJob(jobId: string): Promise<CandidateRankResponse> {
  const cached = unstable_cache(
    () => computeRankForJob(jobId),
    [`candidates-rank-${jobId}`],
    { revalidate: 900, tags: [getCandidateRankCacheTag(jobId)] }
  )
  return cached()
}
