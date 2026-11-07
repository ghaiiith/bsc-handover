import type { CandidateForRanking } from '@/types/candidates'

export interface FallbackRankInput extends CandidateForRanking {
  email: string
  avatarUrl?: string
  availability: boolean
  hasCvProfile: boolean
  experience: import('@/types/profile').ExperienceItem[]
  education: import('@/types/profile').EducationItem[]
  projects: import('@/types/profile').ProjectItem[]
}

export interface FallbackRankResult {
  userId: string
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase()
}

function skillsMatch(candidateSkill: string, jobSkill: string): boolean {
  const c = normalizeSkill(candidateSkill)
  const j = normalizeSkill(jobSkill)
  if (!c || !j) return false
  return c === j || c.includes(j) || j.includes(c)
}

export function fallbackRankCandidates(
  candidates: FallbackRankInput[],
  jobSkills: string[]
): FallbackRankResult[] {
  const normalizedJobSkills = jobSkills.map((s) => s.trim()).filter(Boolean)
  const totalJobSkills = normalizedJobSkills.length || 1

  return candidates
    .map((candidate) => {
      const matchedSkills = normalizedJobSkills.filter((jobSkill) =>
        candidate.skills.some((s) => skillsMatch(s, jobSkill))
      )
      const missingSkills = normalizedJobSkills.filter(
        (jobSkill) => !candidate.skills.some((s) => skillsMatch(s, jobSkill))
      )
      const matchScore = Math.round((matchedSkills.length / totalJobSkills) * 100)

      return {
        userId: candidate.id,
        matchScore,
        matchedSkills,
        missingSkills,
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
}
