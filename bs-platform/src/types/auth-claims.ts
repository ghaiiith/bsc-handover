import type { UserRole } from '@/types'
import type { OnboardingAccountType } from '@/types/onboarding'

/** Server-controlled JWT app_metadata keys (never use user_metadata for RBAC). */
export interface PlatformAuthClaims {
  role?: UserRole
  is_active?: boolean
  profile_status?: 'active' | 'suspended' | 'pending'
  account_type?: OnboardingAccountType | null
  onboarding_completed?: boolean
  onboarding_completed_at?: string
  claims_version?: number
  claims_updated_at?: string
  /** Single-active-session epoch (report BS-04); mirrors users.current_session_id. */
  session_epoch?: string
}

export const PLATFORM_CLAIM_KEYS = [
  'role',
  'is_active',
  'profile_status',
  'account_type',
  'onboarding_completed',
  'onboarding_completed_at',
  'claims_version',
  'claims_updated_at',
  'session_epoch',
] as const satisfies readonly (keyof PlatformAuthClaims)[]
