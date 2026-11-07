import type { EducationItem, ExperienceItem, ProjectItem } from '@/types/profile'

export interface CandidateForRanking {
  id: string
  name: string
  headline: string
  skills: string[]
  experience_titles: string[]
  experience_years: number
  education_fields: string[]
  preferred_role: string
  location: string
}

export interface RankedCandidate {
  userId: string
  name: string
  headline: string
  location: string
  skills: string[]
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  yearsExperience: number
  email: string
  avatarUrl?: string
  availability: boolean
  hasCvProfile: boolean
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
}

export interface CandidateRankResponse {
  candidates: RankedCandidate[]
  totalScanned: number
  totalEligible: number
  jobTitle: string
  isFallback: boolean
  analyzedAt: string
}

export interface CandidateAnalyzeResponse {
  report: {
    score: number
    missing_keywords: string[]
    suggestions: string[]
  }
  profile: {
    full_name: string
    headline: string
    skills: string[]
    experience: ExperienceItem[]
    education: EducationItem[]
    projects: ProjectItem[]
    location: string
    years_of_experience: number
    availability: boolean
    avatar_url?: string
  }
  candidateName: string
  jobTitle: string
}
