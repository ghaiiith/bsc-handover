import type { OnboardingAccountType, OnboardingMeta } from '@/types/onboarding'

export function isPrivilegedAccountType(
  accountType: OnboardingAccountType | null | undefined
): accountType is Exclude<OnboardingAccountType, 'student'> {
  return accountType === 'instructor' || accountType === 'company' || accountType === 'freelancer'
}

export function hasDeclinedRoleRequest(meta: OnboardingMeta | null | undefined): boolean {
  return meta?.role_request_declined === true
}

export function buildRoleRequestPromptUrl(locale: string): string {
  return `/${locale}/dashboard?roleRequestPrompt=1`
}
