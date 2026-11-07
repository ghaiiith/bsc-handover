import type { User as AuthUser } from '@supabase/supabase-js'
import type { User } from '@/types'
import type { PlatformAuthClaims } from '@/types/auth-claims'
import type { OnboardingAccountType } from '@/types/onboarding'
import { isValidAccountType } from '@/lib/auth/claims-projection'

export function getDisplayName(
  profile: User | null | undefined,
  authUser?: Pick<AuthUser, 'email' | 'user_metadata'> | null,
  locale: 'ar' | 'en' = 'ar'
): string {
  const fromMeta = authUser?.user_metadata?.full_name
  const metaName = typeof fromMeta === 'string' ? fromMeta.trim() : ''

  return (
    profile?.full_name?.trim() ||
    metaName ||
    profile?.email?.split('@')[0] ||
    authUser?.email?.split('@')[0] ||
    (locale === 'ar' ? 'مستخدم' : 'User')
  )
}

export function profileFromAuthUser(authUser: AuthUser): User {
  const meta = (authUser.app_metadata ?? {}) as PlatformAuthClaims
  const role =
    meta.role === 'student' ||
    meta.role === 'instructor' ||
    meta.role === 'admin' ||
    meta.role === 'company' ||
    meta.role === 'freelancer'
      ? meta.role
      : 'student'

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: getDisplayName(null, authUser),
    role,
    is_active: meta.is_active !== false,
    created_at: authUser.created_at,
    onboarding_completed: meta.onboarding_completed === true,
    account_type: isValidAccountType(meta.account_type) ? meta.account_type : null,
  }
}

/** Fill profile gaps from JWT app_metadata when DB/RPC fields are missing. */
export function mergeProfileWithClaims(profile: User, authUser: AuthUser): User {
  const meta = (authUser.app_metadata ?? {}) as PlatformAuthClaims
  const claimRole =
    meta.role === 'student' ||
    meta.role === 'instructor' ||
    meta.role === 'admin' ||
    meta.role === 'company' ||
    meta.role === 'freelancer'
      ? meta.role
      : null

  return {
    ...profile,
    role: profile.role ?? claimRole ?? 'student',
    is_active: profile.is_active ?? meta.is_active !== false,
    onboarding_completed:
      profile.onboarding_completed === true ? true : meta.onboarding_completed === true,
    account_type:
      profile.account_type ??
      (isValidAccountType(meta.account_type) ? meta.account_type : null),
  }
}
