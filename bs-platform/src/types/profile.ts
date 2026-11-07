export interface ExperienceItem {
  id: string
  company: string
  title: string
  start_date: string
  end_date: string | null
  is_current: boolean
  location: string
  description: string
}

export interface EducationItem {
  id: string
  institution: string
  degree: string
  field: string
  start_year: number
  end_year: number | null
  is_current: boolean
  gpa?: string
}

export interface ProjectItem {
  id: string
  name: string
  description: string
  technologies: string[]
  url?: string
  github_url?: string
}

export interface ProfileLinks {
  linkedin?: string
  github?: string
  website?: string
  twitter?: string
}

import type { OnboardingPreferences } from '@/types/onboarding'

export type UserPreferences = OnboardingPreferences & Record<string, unknown>

export interface UserProfile {
  id: string
  email: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  role: string
  bio?: string | null
  bio_ar?: string | null
  phone?: string | null
  headline?: string | null
  skills?: string[]
  experience?: ExperienceItem[]
  education?: EducationItem[]
  projects?: ProjectItem[]
  links?: ProfileLinks
  preferred_role?: string | null
  location?: string | null
  years_of_experience?: number | null
  availability?: boolean
  availability_status?: 'open_to_work' | 'open_to_offers' | 'not_looking' | null
  expected_salary_amount?: number | null
  expected_salary_currency?: string | null
  expected_salary_period?: 'monthly' | 'yearly' | null
  expected_salary_public?: boolean | null
  profile_completed_at?: string | null
  portfolio_slug?: string | null
  uploaded_cv_url?: string | null
  uploaded_cv_name?: string | null
  portfolio_is_public?: boolean
  preferences?: UserPreferences
}

export interface ProfileFormState {
  full_name: string
  full_name_ar: string
  avatar_url: string
  headline: string
  phone: string
  location: string
  years_of_experience: number | null
  preferred_role: string
  availability: boolean
  /** Report BS-61: explicit three-state availability; `availability` is derived. */
  availability_status?: 'open_to_work' | 'open_to_offers' | 'not_looking'
  /** Report BS-82: candidate opt-out of company messages (default true). */
  accepts_messages?: boolean
  // Report BS-65: optional expected salary — never required, excluded from the
  // completion score, visibility controlled by the candidate.
  expected_salary_amount?: number | null
  expected_salary_currency?: string
  expected_salary_period?: 'monthly' | 'yearly'
  expected_salary_public?: boolean
  bio: string
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  links: ProfileLinks
}

export interface CvExtractedProfile {
  full_name?: string
  full_name_ar?: string
  email?: string
  phone?: string
  headline?: string
  location?: string
  bio?: string
  skills?: string[]
  experience?: ExperienceItem[]
  education?: EducationItem[]
  projects?: ProjectItem[]
  links?: ProfileLinks
}
