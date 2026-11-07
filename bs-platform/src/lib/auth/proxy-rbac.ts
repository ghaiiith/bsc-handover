import type { UserRole } from '@/types'
import type { PlatformAuthClaims } from '@/types/auth-claims'
import type { OnboardingAccountType } from '@/types/onboarding'
import { getDefaultWorkspacePath } from '@/lib/auth/personalized-home'
import {
  isOnboardingCompleteForRole,
  isValidAccountType,
} from '@/lib/auth/claims-projection'

/** @deprecated Use isPublicAnonymousRoute — kept for tests referencing legacy helper */
export const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/learn',
  '/payment',
  '/cv-builder',
  '/instructor',
  '/admin',
  '/courses',
  '/jobs',
  '/services',
  '/community',
  '/home',
  '/onboarding',
  '/portfolio',
  '/certificate',
] as const

const VALID_ROLES: readonly UserRole[] = ['student', 'instructor', 'admin', 'company', 'freelancer']

/** Routes accessible without authentication (Option B public landing + auth). */
export const PUBLIC_ANONYMOUS_EXACT = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
  // Lead-generation landing page — must be reachable by anonymous visitors.
  '/growth-guide',
  // Public content — browsable without an account (conversion + SEO).
  // Matching includes sub-paths, so detail pages are covered too; write
  // actions inside them stay gated by their own server-side auth checks.
  '/courses',
  '/jobs',
  '/services',
  '/community',
  '/offers',
  '/sellers',
  '/portfolio',
  '/certificate',
] as const

export const PUBLIC_ANONYMOUS_PREFIXES = ['/maintenance'] as const

/** Routes allowed while onboarding is incomplete. */
export const ONBOARDING_EXEMPT_EXACT = [
  '/onboarding',
  '/account-suspended',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const

const AUTH_EXACT = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const

export function isAuthRoute(pathnameWithoutLocale: string): boolean {
  return AUTH_EXACT.some(
    (route) =>
      pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`)
  )
}

export function isPublicAnonymousRoute(pathnameWithoutLocale: string): boolean {
  if (pathnameWithoutLocale === '/') return true
  if (
    PUBLIC_ANONYMOUS_EXACT.some(
      (route) =>
        route !== '/' &&
        (pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`))
    )
  ) {
    return true
  }
  return PUBLIC_ANONYMOUS_PREFIXES.some((prefix) =>
    pathnameWithoutLocale.startsWith(prefix)
  )
}

export function isOnboardingExemptRoute(pathnameWithoutLocale: string): boolean {
  return ONBOARDING_EXEMPT_EXACT.some(
    (route) =>
      pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`)
  )
}

/** Legacy helper — true when route is NOT public-anonymous. */
export function isProtectedRoute(pathnameWithoutLocale: string): boolean {
  return !isPublicAnonymousRoute(pathnameWithoutLocale)
}

/**
 * App sections that require a session. Anonymous requests to paths outside
 * both this list and the public list fall through to the 404 catch-all
 * instead of bouncing to /login.
 */
export const KNOWN_PROTECTED_PREFIXES = [
  '/dashboard',
  '/learn',
  '/payment',
  '/cv-builder',
  '/instructor',
  '/admin',
  '/home',
  '/onboarding',
  '/account-suspended',
] as const

export function isKnownProtectedRoute(pathnameWithoutLocale: string): boolean {
  return KNOWN_PROTECTED_PREFIXES.some(
    (prefix) =>
      pathnameWithoutLocale === prefix || pathnameWithoutLocale.startsWith(`${prefix}/`)
  )
}

export function isPrivilegedRoute(pathnameWithoutLocale: string): boolean {
  return (
    pathnameWithoutLocale.startsWith('/admin') ||
    pathnameWithoutLocale.startsWith('/instructor')
  )
}

export function isValidProxyRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value)
}

export interface ParsedJwtRbacClaims {
  role: UserRole | null
  isActive: boolean | null
  accountType: OnboardingAccountType | null
  onboardingCompleted: boolean | null
  claimsComplete: boolean
  onboardingClaimsComplete: boolean
  claimsVersion: number | null
}

export function parseJwtRbacClaims(
  appMetadata: PlatformAuthClaims | Record<string, unknown> | undefined
): ParsedJwtRbacClaims {
  const meta = appMetadata ?? {}
  const role = isValidProxyRole(meta.role) ? meta.role : null
  const isActive = typeof meta.is_active === 'boolean' ? meta.is_active : null
  const accountType = isValidAccountType(meta.account_type) ? meta.account_type : null
  const onboardingCompleted =
    typeof meta.onboarding_completed === 'boolean' ? meta.onboarding_completed : null
  const claimsVersion =
    typeof meta.claims_version === 'number' && Number.isFinite(meta.claims_version)
      ? meta.claims_version
      : null

  const rbacComplete = role !== null && isActive !== null
  const onboardingClaimsComplete =
    rbacComplete &&
    (role === 'admin' || typeof meta.onboarding_completed === 'boolean')

  return {
    role,
    isActive,
    accountType,
    onboardingCompleted,
    claimsComplete: rbacComplete,
    onboardingClaimsComplete,
    claimsVersion,
  }
}

export type ProxyAuthDecision =
  | { action: 'allow' }
  | { action: 'redirect'; path: string; reason: string; metric?: string }

export interface ProxyAuthInput {
  pathnameWithoutLocale: string
  locale: string
  userId: string | null
  role: UserRole | null
  isActive: boolean | null
  onboardingCompleted: boolean | null
  claimsComplete: boolean
  onboardingClaimsComplete: boolean
  dbFallbackUsed: boolean
  dbFallbackFailed: boolean
  isMaintenance?: boolean
}

function buildLoginRedirect(locale: string, returnPath: string): string {
  const encoded = encodeURIComponent(returnPath)
  return `/${locale}/login?next=${encoded}`
}

function defaultWorkspacePath(locale: string, role: UserRole | null): string {
  return getDefaultWorkspacePath(locale, role)
}

export function decideProxyAuth(input: ProxyAuthInput): ProxyAuthDecision {
  const {
    pathnameWithoutLocale,
    locale,
    userId,
    role,
    isActive,
    onboardingCompleted,
    claimsComplete,
    onboardingClaimsComplete,
    dbFallbackFailed,
    isMaintenance = false,
  } = input

  const fullReturnPath =
    pathnameWithoutLocale === '/'
      ? `/${locale}`
      : `/${locale}${pathnameWithoutLocale}`

  const onboardingComplete = isOnboardingCompleteForRole(role, onboardingCompleted)

  if (!userId) {
    if (isPublicAnonymousRoute(pathnameWithoutLocale)) {
      return { action: 'allow' }
    }
    if (!isKnownProtectedRoute(pathnameWithoutLocale)) {
      // Unknown path — let it 404 (branded not-found) instead of asking to log in.
      return { action: 'allow' }
    }
    return {
      action: 'redirect',
      path: buildLoginRedirect(locale, fullReturnPath),
      reason: 'auth_required',
      metric: 'auth_required_redirect',
    }
  }

  if (isActive === false) {
    if (pathnameWithoutLocale.startsWith('/account-suspended')) {
      return { action: 'allow' }
    }
    return {
      action: 'redirect',
      path: `/${locale}/account-suspended`,
      reason: 'inactive_user_redirected',
      metric: 'inactive_user_redirected',
    }
  }

  if (isAuthRoute(pathnameWithoutLocale)) {
    if (!onboardingComplete) {
      return {
        action: 'redirect',
        path: `/${locale}/onboarding`,
        reason: 'auth_route_onboarding_incomplete',
        metric: 'onboarding_redirected',
      }
    }
    return {
      action: 'redirect',
      path: defaultWorkspacePath(locale, role),
      reason: 'auth_route_already_signed_in',
      metric: 'personalized_home_redirect',
    }
  }

  if (pathnameWithoutLocale === '/') {
    if (!onboardingComplete) {
      return {
        action: 'redirect',
        path: `/${locale}/onboarding`,
        reason: 'landing_onboarding_incomplete',
        metric: 'onboarding_redirected',
      }
    }
    return { action: 'allow' }
  }

  if (!onboardingComplete) {
    if (isOnboardingExemptRoute(pathnameWithoutLocale)) {
      return { action: 'allow' }
    }
    return {
      action: 'redirect',
      path: `/${locale}/onboarding`,
      reason: 'onboarding_incomplete',
      metric: onboardingClaimsComplete ? 'onboarding_redirected' : 'onboarding_missing_claim',
    }
  }

  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (role === 'admin') {
      return { action: 'allow' }
    }
    return {
      action: 'redirect',
      path: defaultWorkspacePath(locale, role),
      reason: 'role_denied_admin',
      metric: 'role_denied',
    }
  }

  if (pathnameWithoutLocale.startsWith('/instructor')) {
    if (role === 'instructor' || role === 'admin') {
      return { action: 'allow' }
    }
    return {
      action: 'redirect',
      path: defaultWorkspacePath(locale, role),
      reason: 'role_denied_instructor',
      metric: 'role_denied',
    }
  }

  if (
    isPrivilegedRoute(pathnameWithoutLocale) &&
    !claimsComplete &&
    dbFallbackFailed &&
    role === null
  ) {
    return {
      action: 'redirect',
      path: buildLoginRedirect(locale, fullReturnPath),
      reason: 'claims_unverified',
      metric: 'db_fallback_failed',
    }
  }

  if (
    isMaintenance &&
    role !== 'admin' &&
    !pathnameWithoutLocale.startsWith('/maintenance') &&
    !pathnameWithoutLocale.startsWith('/login')
  ) {
    return {
      action: 'redirect',
      path: `/${locale}/maintenance`,
      reason: 'maintenance',
    }
  }

  return { action: 'allow' }
}
