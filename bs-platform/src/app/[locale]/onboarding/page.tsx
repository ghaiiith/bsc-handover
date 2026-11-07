import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import { getSessionProfile } from '@/lib/auth/profile'
import { getPostOnboardingRedirect } from '@/lib/onboarding/redirect'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import type { OnboardingAccountType } from '@/types/onboarding'
import type { UserRole } from '@/types'
import { NOINDEX_METADATA } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Onboarding',
  ...NOINDEX_METADATA,
}

export default async function OnboardingPage() {
  const locale = await getLocale()
  const session = await getSessionProfile()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { profile, authUser } = session
  const role = (profile.role ?? 'student') as UserRole

  if (profile.is_active === false) {
    redirect(`/${locale}/account-suspended`)
  }

  if (profile.onboarding_completed === true || role === 'admin') {
    const accountType = (profile.account_type ?? 'student') as OnboardingAccountType
    const [instructorReq, companyReq, freelancerReq] = await Promise.all([
      getMyInstructorRequest(authUser.id),
      getMyCompanyAffiliationRequest(authUser.id),
      getMyFreelancerRequest(authUser.id),
    ])
    redirect(
      getPostOnboardingRedirect({
        locale,
        role,
        accountType,
        instructorRequestStatus: instructorReq?.status ?? null,
        companyRequestStatus: companyReq?.status ?? null,
        freelancerRequestStatus: freelancerReq?.status ?? null,
      })
    )
  }

  return <OnboardingFlow />
}
