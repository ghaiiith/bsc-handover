import type {
  CvExtractedProfile,
  ProfileFormState,
  ProfileLinks,
} from '@/types/profile'

function normalizeSkill(skill: string): string {
  return skill.trim().replace(/\s+/g, ' ')
}

function mergeSkills(existing: string[], incoming: string[] = []): string[] {
  const set = new Set(existing.map((s) => normalizeSkill(s).toLowerCase()))
  const merged = [...existing]

  for (const skill of incoming) {
    const normalized = normalizeSkill(skill)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (set.has(key)) continue
    set.add(key)
    merged.push(normalized)
  }

  return merged.slice(0, 30)
}

function mergeArrayById<T extends { id: string }>(existing: T[], incoming: T[] = []): T[] {
  const existingIds = new Set(existing.map((item) => item.id))
  const added = incoming.filter((item) => !existingIds.has(item.id))
  return [...existing, ...added]
}

function fillIfEmpty(current: string, incoming?: string): string {
  if (current.trim()) return current
  return incoming?.trim() ?? ''
}

function mergeLinks(current: ProfileLinks, incoming?: ProfileLinks): ProfileLinks {
  if (!incoming) return current
  return {
    linkedin: current.linkedin?.trim() || incoming.linkedin?.trim() || undefined,
    github: current.github?.trim() || incoming.github?.trim() || undefined,
    website: current.website?.trim() || incoming.website?.trim() || undefined,
    twitter: current.twitter?.trim() || incoming.twitter?.trim() || undefined,
  }
}

export function mergeCvIntoProfile(
  current: ProfileFormState,
  extracted: CvExtractedProfile
): ProfileFormState {
  return {
    ...current,
    full_name: fillIfEmpty(current.full_name, extracted.full_name),
    full_name_ar: fillIfEmpty(current.full_name_ar, extracted.full_name_ar),
    phone: fillIfEmpty(current.phone, extracted.phone),
    headline: fillIfEmpty(current.headline, extracted.headline),
    location: fillIfEmpty(current.location, extracted.location),
    bio: fillIfEmpty(current.bio, extracted.bio),
    skills: mergeSkills(current.skills, extracted.skills),
    experience: mergeArrayById(current.experience, extracted.experience),
    education: mergeArrayById(current.education, extracted.education),
    projects: mergeArrayById(current.projects, extracted.projects),
    links: mergeLinks(current.links, extracted.links),
  }
}

export function userProfileToFormState(user: {
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
  phone?: string | null
  location?: string | null
  years_of_experience?: number | null
  preferred_role?: string | null
  availability?: boolean | null
  availability_status?: 'open_to_work' | 'open_to_offers' | 'not_looking' | null
  accepts_messages?: boolean | null
  expected_salary_amount?: number | null
  expected_salary_currency?: string | null
  expected_salary_period?: 'monthly' | 'yearly' | null
  expected_salary_public?: boolean | null
  bio?: string | null
  skills?: string[] | null
  experience?: unknown
  education?: unknown
  projects?: unknown
  links?: unknown
}): ProfileFormState {
  return {
    full_name: user.full_name ?? '',
    full_name_ar: user.full_name_ar ?? '',
    avatar_url: user.avatar_url ?? '',
    headline: user.headline ?? '',
    phone: user.phone ?? '',
    location: user.location ?? '',
    years_of_experience: user.years_of_experience ?? null,
    preferred_role: user.preferred_role ?? '',
    availability: user.availability ?? false,
    availability_status:
      user.availability_status ?? (user.availability === false ? 'not_looking' : 'open_to_work'),
    accepts_messages: user.accepts_messages ?? true,
    expected_salary_amount: user.expected_salary_amount ?? null,
    expected_salary_currency: user.expected_salary_currency ?? 'IQD',
    expected_salary_period: user.expected_salary_period ?? 'monthly',
    expected_salary_public: user.expected_salary_public ?? true,
    bio: user.bio ?? '',
    skills: user.skills ?? [],
    experience: Array.isArray(user.experience) ? (user.experience as ProfileFormState['experience']) : [],
    education: Array.isArray(user.education) ? (user.education as ProfileFormState['education']) : [],
    projects: Array.isArray(user.projects) ? (user.projects as ProfileFormState['projects']) : [],
    links: (user.links as ProfileLinks) ?? {},
  }
}
