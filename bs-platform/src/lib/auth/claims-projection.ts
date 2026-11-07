import type { PlatformAuthClaims } from '@/types/auth-claims'
import type { UserRole } from '@/types'
import type { OnboardingAccountType } from '@/types/onboarding'

/**
 * Pure JWT `app_metadata` claim projection helpers.
 *
 * Kept free of `server-only` so it is unit-testable and reusable by both the
 * runtime sync helper and the backfill script. Contains no I/O or secrets.
 */

export interface CanonicalClaimSource {
  role: UserRole
  is_active: boolean
  account_type: OnboardingAccountType | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
}

const VALID_ACCOUNT_TYPES: readonly OnboardingAccountType[] = [
  'student',
  'instructor',
  'company',
  'freelancer',
]

export function isValidAccountType(value: unknown): value is OnboardingAccountType {
  return (
    typeof value === 'string' &&
    (VALID_ACCOUNT_TYPES as readonly string[]).includes(value)
  )
}

export function profileStatusFromActive(
  isActive: boolean
): PlatformAuthClaims['profile_status'] {
  return isActive ? 'active' : 'suspended'
}

function onboardingClaimsChanged(
  existing: Record<string, unknown>,
  row: CanonicalClaimSource
): boolean {
  return (
    existing.account_type !== row.account_type ||
    existing.onboarding_completed !== row.onboarding_completed ||
    existing.onboarding_completed_at !== row.onboarding_completed_at
  )
}

/**
 * Merge canonical user fields onto existing `app_metadata`, preserving
 * every unrelated key. `claims_version` increments when role, active,
 * or onboarding projection changes.
 */
export function buildPlatformClaims(
  existing: Record<string, unknown>,
  row: CanonicalClaimSource,
  incrementVersion: boolean
): PlatformAuthClaims & Record<string, unknown> {
  const previousVersion =
    typeof existing.claims_version === 'number' && Number.isFinite(existing.claims_version)
      ? existing.claims_version
      : 0

  const roleChanged = existing.role !== row.role
  const activeChanged = existing.is_active !== row.is_active
  const onboardingChanged = onboardingClaimsChanged(existing, row)
  const shouldIncrement =
    incrementVersion &&
    (previousVersion === 0 || roleChanged || activeChanged || onboardingChanged)

  const onboardingCompletedAt = row.onboarding_completed
    ? row.onboarding_completed_at ?? new Date().toISOString()
    : null

  return {
    ...existing,
    role: row.role,
    is_active: row.is_active,
    profile_status: profileStatusFromActive(row.is_active),
    account_type: row.account_type,
    onboarding_completed: row.onboarding_completed,
    ...(onboardingCompletedAt ? { onboarding_completed_at: onboardingCompletedAt } : {}),
    claims_version: shouldIncrement ? previousVersion + 1 : previousVersion || 1,
    claims_updated_at: new Date().toISOString(),
  }
}

/** Admins skip mandatory onboarding gating in the proxy. */
export function isOnboardingCompleteForRole(
  role: UserRole | null,
  onboardingCompleted: boolean | null
): boolean {
  if (role === 'admin') return true
  return onboardingCompleted === true
}
