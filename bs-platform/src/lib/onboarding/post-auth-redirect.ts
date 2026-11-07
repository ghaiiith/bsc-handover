'use server'

import { getSessionProfile } from '@/lib/auth/profile'
import {
  canAccessPathWithRole,
  isSafeNextPath,
  normalizeNextPath,
} from '@/lib/auth/safe-redirect'
import { getPostOnboardingRedirect } from '@/lib/onboarding/redirect'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import type { OnboardingAccountType } from '@/types/onboarding'
import type { UserRole } from '@/types'

export async function resolvePostAuthRedirect(
  locale: string,
  next?: string | null
): Promise<string> {
  const session = await getSessionProfile()
  if (!session) {
    return `/${locale}/login`
  }

  const { profile, authUser } = session
  const role = (profile.role ?? 'student') as UserRole

  if (profile.is_active === false) {
    return `/${locale}/account-suspended`
  }

  const onboardingComplete = profile.onboarding_completed === true || role === 'admin'

  if (!onboardingComplete) {
    return `/${locale}/onboarding`
  }

  if (next && isSafeNextPath(next, locale)) {
    const normalized = normalizeNextPath(next, locale)
    if (canAccessPathWithRole(normalized, role)) {
      return normalized
    }
  }

  const accountType = (profile.account_type ?? 'student') as OnboardingAccountType
  const [instructorReq, companyReq, freelancerReq] = await Promise.all([
    getMyInstructorRequest(authUser.id),
    getMyCompanyAffiliationRequest(authUser.id),
    getMyFreelancerRequest(authUser.id),
  ])

  return getPostOnboardingRedirect({
    locale,
    role,
    accountType,
    instructorRequestStatus: instructorReq?.status ?? null,
    companyRequestStatus: companyReq?.status ?? null,
    freelancerRequestStatus: freelancerReq?.status ?? null,
  })
}
