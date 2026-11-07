import type { UserRole } from '@/types'
import type { OnboardingAccountType } from '@/types/onboarding'
import type { InstructorRequestStatus } from '@/types'
import { buildRoleRequestPromptUrl } from '@/lib/onboarding/role-request-utils'

export interface PostOnboardingRedirectInput {
  locale: string
  role: UserRole
  accountType: OnboardingAccountType
  instructorRequestStatus?: InstructorRequestStatus | null
  companyRequestStatus?: InstructorRequestStatus | null
  freelancerRequestStatus?: InstructorRequestStatus | null
}

export function getPostOnboardingRedirect({
  locale,
  role,
  accountType,
  instructorRequestStatus,
  companyRequestStatus,
  freelancerRequestStatus,
}: PostOnboardingRedirectInput): string {
  if (role === 'admin') {
    return `/${locale}/admin`
  }

  if (accountType === 'instructor') {
    if (role === 'instructor') {
      return `/${locale}/instructor`
    }
    if (!instructorRequestStatus) {
      return buildRoleRequestPromptUrl(locale)
    }
    return `/${locale}/dashboard/become-instructor`
  }

  if (accountType === 'company') {
    if (role === 'company') {
      return `/${locale}/dashboard/company-jobs`
    }
    if (!companyRequestStatus) {
      return buildRoleRequestPromptUrl(locale)
    }
    return `/${locale}/dashboard/company-affiliation`
  }

  if (accountType === 'freelancer') {
    if (role === 'freelancer') {
      // Report BS-44: land a service provider on their Services workspace.
      return `/${locale}/dashboard/my-services`
    }
    if (!freelancerRequestStatus) {
      return buildRoleRequestPromptUrl(locale)
    }
    return `/${locale}/dashboard/become-freelancer`
  }

  // Students land on the Courses catalogue — something they can act on
  // immediately — rather than an empty dashboard (report BS-07).
  return `/${locale}/courses`
}
