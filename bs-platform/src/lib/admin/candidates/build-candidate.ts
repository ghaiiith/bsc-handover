import type { CandidateForRanking } from '@/types/candidates'
import type { EducationItem, ExperienceItem } from '@/types/profile'

type CandidateUserRow = {
  id: string
  full_name: string
  full_name_ar?: string | null
  headline?: string | null
  skills?: string[] | null
  experience?: ExperienceItem[] | null
  education?: EducationItem[] | null
  preferred_role?: string | null
  location?: string | null
  years_of_experience?: number | null
}

export function buildCandidateForRanking(user: CandidateUserRow): CandidateForRanking {
  const experience = (user.experience as ExperienceItem[] | undefined) ?? []
  const education = (user.education as EducationItem[] | undefined) ?? []

  return {
    id: user.id,
    name: user.full_name?.trim() || user.full_name_ar?.trim() || '—',
    headline: user.headline?.trim() || '',
    skills: (user.skills ?? []).map((s) => s.trim()).filter(Boolean),
    experience_titles: experience.map((e) => e.title?.trim()).filter(Boolean) as string[],
    experience_years: user.years_of_experience ?? 0,
    education_fields: education.map((e) => e.field?.trim()).filter(Boolean) as string[],
    preferred_role: user.preferred_role?.trim() || '',
    location: user.location?.trim() || '',
  }
}

export function buildJobDescriptionString(job: {
  title_ar: string
  title: string
  description_ar: string
  description: string
  skills: string[]
}): string {
  const title = job.title_ar?.trim() || job.title?.trim() || ''
  const description = job.description_ar?.trim() || job.description?.trim() || ''
  const skills = (job.skills ?? []).join(', ')
  return `${title} - ${description}${skills ? ` Required skills: ${skills}` : ''}`.trim()
}
