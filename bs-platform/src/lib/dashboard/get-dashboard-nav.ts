import type { User } from '@/types'
import type { OnboardingAccountType } from '@/types/onboarding'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import {
  getBaseStudentNavGroups,
  getCommonAccountNavGroups,
  getAdminRoleNavGroups,
  getCompanyRoleNavGroups,
  getFreelancerRoleNavGroups,
  getInstructorRoleNavGroups,
  type DashboardNavGroup,
} from '@/lib/dashboard/nav-links'

export interface DashboardNavBuildInput {
  locale: string
  profile: User
  userId: string
}

/**
 * Student sidebar is always shown. Role-specific groups are appended when the user
 * chose that account type in onboarding or has submitted an application.
 */
export async function getDashboardNavGroups({
  locale,
  profile,
  userId,
}: DashboardNavBuildInput): Promise<DashboardNavGroup[]> {
  const role = profile.role ?? 'student'
  const accountType = (profile.account_type ?? null) as OnboardingAccountType | null

  const [instructorReq, companyReq, freelancerReq] = await Promise.all([
    shouldLoadInstructorNav(role, accountType)
      ? getMyInstructorRequest(userId)
      : Promise.resolve(null),
    shouldLoadCompanyNav(role, accountType)
      ? getMyCompanyAffiliationRequest(userId)
      : Promise.resolve(null),
    shouldLoadFreelancerNav(role, accountType)
      ? getMyFreelancerRequest(userId)
      : Promise.resolve(null),
  ])

  // Role-specific groups (Instructor / Company / Freelancer) come FIRST — they
  // matter most to that user — above the generic learning nav (report BS-23).
  const roleGroups: DashboardNavGroup[] = []

  if (role === 'instructor' || role === 'admin') {
    roleGroups.push(...getInstructorRoleNavGroups(locale, 'approved'))
  } else if (accountType === 'instructor' || instructorReq) {
    roleGroups.push(...getInstructorRoleNavGroups(locale, 'application'))
  }

  if (role === 'company' || role === 'admin') {
    roleGroups.push(...getCompanyRoleNavGroups(locale, 'approved'))
  } else if (accountType === 'company' || companyReq) {
    roleGroups.push(...getCompanyRoleNavGroups(locale, 'application'))
  }

  if (role === 'freelancer' || role === 'admin') {
    roleGroups.push(...getFreelancerRoleNavGroups(locale, 'approved'))
  } else if (accountType === 'freelancer' || freelancerReq) {
    roleGroups.push(...getFreelancerRoleNavGroups(locale, 'application'))
  }

  // Report BS-45: only students (and admins, who oversee everything) get the
  // full student learning nav. A company / service provider / instructor sees
  // their own workspace plus the common account tabs — no student learning tabs.
  const isDedicatedRole =
    role === 'company' || role === 'freelancer' || role === 'instructor'

  const groups: DashboardNavGroup[] = [
    ...roleGroups,
    ...(isDedicatedRole
      ? getCommonAccountNavGroups(locale)
      : getBaseStudentNavGroups(locale)),
  ]

  // Admin tools sit at the very top for admins.
  if (role === 'admin') {
    groups.unshift(...getAdminRoleNavGroups(locale))
  }

  return groups
}

function shouldLoadInstructorNav(
  role: User['role'],
  accountType: OnboardingAccountType | null
): boolean {
  return role === 'instructor' || role === 'admin' || accountType === 'instructor'
}

function shouldLoadCompanyNav(
  role: User['role'],
  accountType: OnboardingAccountType | null
): boolean {
  return role === 'company' || role === 'admin' || accountType === 'company'
}

function shouldLoadFreelancerNav(
  role: User['role'],
  accountType: OnboardingAccountType | null
): boolean {
  return role === 'freelancer' || role === 'admin' || accountType === 'freelancer'
}
