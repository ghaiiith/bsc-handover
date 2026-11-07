import type { EducationItem, ExperienceItem, ProfileFormState, ProfileLinks } from '@/types/profile'
import { meetsCommunityThreshold } from '@/lib/community/constants'
import { calculateProfileScore } from '@/lib/profile/profile-score'

export interface CommunityUserRow {
  id: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
  location?: string | null
  skills?: string[] | null
  availability?: boolean | null
  // Backfilled on demand by the community layer — a member may surface before a
  // slug has been generated, so it is nullable here.
  portfolio_slug: string | null
  is_verified?: boolean | null
  bio?: string | null
  preferred_role?: string | null
  experience?: ExperienceItem[] | null
  education?: EducationItem[] | null
  projects?: unknown[] | null
  links?: ProfileLinks | null
  years_of_experience?: number | null
  created_at: string
  profile_completed_at?: string | null
}

export function getProfileScoreFromRow(row: CommunityUserRow): number {
  const form: ProfileFormState = {
    full_name: row.full_name ?? '',
    full_name_ar: row.full_name_ar ?? '',
    avatar_url: row.avatar_url ?? '',
    headline: row.headline ?? '',
    phone: '',
    location: row.location ?? '',
    years_of_experience: row.years_of_experience ?? null,
    preferred_role: row.preferred_role ?? '',
    availability: Boolean(row.availability),
    expected_salary_amount: null,
    expected_salary_period: 'monthly',
    expected_salary_public: true,
    bio: row.bio ?? '',
    skills: row.skills ?? [],
    experience: row.experience ?? [],
    education: row.education ?? [],
    projects: [],
    links: row.links ?? {},
  }
  return calculateProfileScore(form)
}

/**
 * A member appears in the community once they have made a genuine effort on their
 * profile: at least one skill AND a headline or bio. The base query already scopes
 * to active, public, onboarded users. We deliberately do NOT require a high profile
 * score or a pre-existing portfolio slug here — the strict score>=60 + slug gate
 * silently hid every real user (report BS-17); the slug is backfilled on demand.
 */
export function isCommunityEligible(row: CommunityUserRow): boolean {
  // Report BS-83: respect the availability flag — someone who explicitly set
  // "not available for work" is hidden from the Community (null/true still show,
  // so the default and opted-in members appear).
  if (row.availability === false) return false
  // Report BS-67/68: appear once profile completion reaches the threshold — the
  // SAME score shown on the profile screen, so a qualifying student is never
  // silently excluded. The base query already scopes to active/public/onboarded.
  return meetsCommunityThreshold(getProfileScoreFromRow(row))
}

export function filterCommunityMembers(rows: CommunityUserRow[]): CommunityUserRow[] {
  return rows.filter(isCommunityEligible)
}
