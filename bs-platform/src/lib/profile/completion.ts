import { calculateProfileScore } from '@/lib/profile/profile-score'
import { calculateCompanyProfileScore } from '@/lib/company/company-profile'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import type { CompanyProfileInput } from '@/lib/company/company-profile'
import type { ProfileFormState } from '@/types/profile'

/**
 * Report BS-90: the dashboard shell and the profile page disagreed on how
 * complete a company profile was.
 *
 * The shell ran `calculateProfileScore` — the CV-style formula built for
 * students (headline, skills, experience, education) — against a company
 * record that has none of those fields, while the company profile page ran
 * `calculateCompanyProfileScore` over the organisation's own required list.
 * Two formulas, two numbers, and no way for the company to tell which counted.
 *
 * This is the single entry point both views now use, so the required-field
 * list lives in exactly one place per role.
 */

/** Field names a company record carries; enough to score it without a cast. */
type CompanyLikeProfile = Partial<Record<keyof CompanyProfileInput, unknown>>

export function getCompanyProfileCompletion(profile: CompanyLikeProfile): number {
  return calculateCompanyProfileScore(profile as Partial<CompanyProfileInput>)
}

export function getStudentProfileCompletion(form: ProfileFormState): number {
  return calculateProfileScore(form)
}

/**
 * The completion percentage for any role. Companies are scored on the
 * organisation checklist; everyone else on the CV checklist.
 */
export function getProfileCompletion(
  profile: Record<string, unknown> | null | undefined,
  role: string | null | undefined
): number {
  if (!profile) return 0

  if (role === 'company') {
    return getCompanyProfileCompletion(profile as CompanyLikeProfile)
  }

  return getStudentProfileCompletion(
    userProfileToFormState(profile as Parameters<typeof userProfileToFormState>[0])
  )
}
