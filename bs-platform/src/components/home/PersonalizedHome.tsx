import type { User } from '@/types'
import StudentHomeView from '@/components/home/StudentHomeView'
import InstructorHomeView from '@/components/home/InstructorHomeView'
import CompanyHomeView from '@/components/home/CompanyHomeView'
import FreelancerHomeView from '@/components/home/FreelancerHomeView'
import type { User as AuthUser } from '@supabase/supabase-js'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import { hasDeclinedRoleRequest } from '@/lib/onboarding/role-request-utils'
import type { OnboardingMeta } from '@/types/onboarding'

interface PersonalizedHomeProps {
  profile: User
  authUser: AuthUser
  locale: string
  userId: string
}

async function shouldUseStudentHome(
  profile: User,
  userId: string
): Promise<boolean> {
  const meta = (profile.onboarding_meta ?? {}) as OnboardingMeta
  const accountType = profile.account_type ?? 'student'

  if (accountType === 'student') return false

  const isApproved =
    (accountType === 'instructor' && (profile.role === 'instructor' || profile.role === 'admin')) ||
    (accountType === 'company' && (profile.role === 'company' || profile.role === 'admin')) ||
    (accountType === 'freelancer' && (profile.role === 'freelancer' || profile.role === 'admin'))

  if (isApproved) return false

  if (hasDeclinedRoleRequest(meta)) return true

  if (accountType === 'instructor') {
    const request = await getMyInstructorRequest(userId)
    return !request
  }
  if (accountType === 'company') {
    const request = await getMyCompanyAffiliationRequest(userId)
    return !request
  }
  if (accountType === 'freelancer') {
    const request = await getMyFreelancerRequest(userId)
    return !request
  }

  return false
}

export default async function PersonalizedHome({
  profile,
  authUser,
  locale,
  userId,
}: PersonalizedHomeProps) {
  const accountType = profile.account_type ?? 'student'

  if (accountType === 'student') {
    return (
      <StudentHomeView
        profile={profile}
        authUser={authUser}
        locale={locale}
      />
    )
  }

  const useStudentHome = await shouldUseStudentHome(profile, userId)

  if (useStudentHome) {
    return (
      <StudentHomeView
        profile={profile}
        authUser={authUser}
        locale={locale}
        showRoleApplyBanner
        accountType={accountType}
      />
    )
  }

  if (accountType === 'instructor') {
    return (
      <InstructorHomeView
        profile={profile}
        authUser={authUser}
        locale={locale}
        userId={userId}
      />
    )
  }

  if (accountType === 'company') {
    return (
      <CompanyHomeView
        profile={profile}
        authUser={authUser}
        locale={locale}
        userId={userId}
      />
    )
  }

  if (accountType === 'freelancer' || profile.role === 'freelancer') {
    return (
      <FreelancerHomeView
        profile={profile}
        authUser={authUser}
        locale={locale}
        userId={userId}
      />
    )
  }

  return (
    <StudentHomeView
      profile={profile}
      authUser={authUser}
      locale={locale}
    />
  )
}
