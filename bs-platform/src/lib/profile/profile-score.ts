import type { ProfileFormState } from '@/types/profile'

export function calculateProfileScore(state: ProfileFormState): number {
  let score = 0

  if (state.full_name.trim()) score += 10
  if (state.avatar_url.trim()) score += 10
  if (state.headline.trim()) score += 10
  if (state.bio.trim()) score += 10
  if (state.skills.length >= 3) score += 15
  if (state.experience.length >= 1) score += 15
  if (state.education.length >= 1) score += 10
  if (state.location.trim()) score += 5
  if (state.preferred_role.trim()) score += 10

  const links = state.links
  const hasLink = Boolean(
    links.linkedin?.trim() ||
      links.github?.trim() ||
      links.website?.trim() ||
      links.twitter?.trim()
  )
  if (hasLink) score += 5

  return score
}

/**
 * Report BS-27: fields that must be filled before a profile counts as complete —
 * both names, professional headline, city, job role, at least one skill, and at
 * least one education OR experience entry. Saving a partial profile is still
 * allowed; it just does not become "complete".
 */
export function getMissingRequiredProfileFields(state: ProfileFormState): string[] {
  const missing: string[] = []
  if (!state.full_name?.trim()) missing.push('full_name')
  if (!state.full_name_ar?.trim()) missing.push('full_name_ar')
  if (!state.headline?.trim()) missing.push('headline')
  if (!state.location?.trim()) missing.push('location')
  if (!state.preferred_role?.trim()) missing.push('preferred_role')
  if ((state.skills ?? []).filter((s) => s?.trim()).length < 1) missing.push('skills')
  if ((state.experience ?? []).length < 1 && (state.education ?? []).length < 1) {
    missing.push('experience_or_education')
  }
  return missing
}

export function isProfileComplete(state: ProfileFormState): boolean {
  return getMissingRequiredProfileFields(state).length === 0
}

export function getProfileScoreColor(score: number): string {
  if (score <= 40) return 'bg-destructive'
  if (score <= 70) return 'bg-orange-500'
  return 'bg-green-500'
}

export interface ProfileMissingItem {
  id: string
  hash: string
  labelKey: string
}

export function getProfileMissingItems(state: ProfileFormState): ProfileMissingItem[] {
  const missing: ProfileMissingItem[] = []

  if (!state.full_name.trim()) {
    missing.push({ id: 'name', hash: 'basic', labelKey: 'missing_name' })
  }
  if (!state.avatar_url.trim()) {
    missing.push({ id: 'avatar', hash: 'basic', labelKey: 'missing_avatar' })
  }
  if (!state.headline.trim()) {
    missing.push({ id: 'headline', hash: 'basic', labelKey: 'missing_headline' })
  }
  if (!state.bio.trim()) {
    missing.push({ id: 'bio', hash: 'bio', labelKey: 'missing_bio' })
  }
  if (state.skills.length < 3) {
    missing.push({ id: 'skills', hash: 'skills', labelKey: 'missing_skills' })
  }
  if (state.experience.length < 1) {
    missing.push({ id: 'experience', hash: 'experience', labelKey: 'missing_experience' })
  }
  if (state.education.length < 1) {
    missing.push({ id: 'education', hash: 'education', labelKey: 'missing_education' })
  }
  if (!state.location.trim()) {
    missing.push({ id: 'location', hash: 'basic', labelKey: 'missing_location' })
  }
  if (!state.preferred_role.trim()) {
    missing.push({ id: 'role', hash: 'basic', labelKey: 'missing_role' })
  }

  const links = state.links
  const hasLink = Boolean(
    links.linkedin?.trim() ||
      links.github?.trim() ||
      links.website?.trim() ||
      links.twitter?.trim()
  )
  if (!hasLink) {
    missing.push({ id: 'links', hash: 'links', labelKey: 'missing_links' })
  }

  return missing
}
