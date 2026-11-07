import { describe, expect, it } from 'vitest'
import {
  decideProxyAuth,
  isProtectedRoute,
  isPublicAnonymousRoute,
  parseJwtRbacClaims,
} from '@/lib/auth/proxy-rbac'

describe('parseJwtRbacClaims', () => {
  it('parses complete app_metadata claims including onboarding', () => {
    const parsed = parseJwtRbacClaims({
      role: 'student',
      is_active: true,
      account_type: 'student',
      onboarding_completed: true,
      claims_version: 2,
    })
    expect(parsed.role).toBe('student')
    expect(parsed.isActive).toBe(true)
    expect(parsed.accountType).toBe('student')
    expect(parsed.onboardingCompleted).toBe(true)
    expect(parsed.claimsComplete).toBe(true)
    expect(parsed.onboardingClaimsComplete).toBe(true)
  })

  it('treats missing onboarding as incomplete claims', () => {
    const parsed = parseJwtRbacClaims({ role: 'student', is_active: true })
    expect(parsed.onboardingCompleted).toBeNull()
    expect(parsed.onboardingClaimsComplete).toBe(false)
  })
})

describe('decideProxyAuth', () => {
  const base = {
    pathnameWithoutLocale: '/courses',
    locale: 'en',
    userId: null,
    role: null,
    isActive: null,
    onboardingCompleted: null,
    claimsComplete: false,
    onboardingClaimsComplete: false,
    dbFallbackUsed: false,
    dbFallbackFailed: false,
    isMaintenance: false,
  }

  it('allows anonymous public landing', () => {
    expect(decideProxyAuth({ ...base, pathnameWithoutLocale: '/' }).action).toBe('allow')
  })

  it('redirects anonymous user on protected page to login with next', () => {
    const decision = decideProxyAuth({ ...base, pathnameWithoutLocale: '/dashboard' })
    expect(decision).toMatchObject({
      action: 'redirect',
      path: '/en/login?next=%2Fen%2Fdashboard',
      metric: 'auth_required_redirect',
    })
  })

  it('allows anonymous browsing of public content sections', () => {
    for (const path of ['/courses', '/courses/abc', '/jobs', '/services', '/community']) {
      expect(decideProxyAuth({ ...base, pathnameWithoutLocale: path }).action).toBe('allow')
    }
  })

  it('redirects incomplete onboarding from dashboard to onboarding', () => {
    const decision = decideProxyAuth({
      ...base,
      pathnameWithoutLocale: '/dashboard',
      userId: 'user-1',
      role: 'student',
      isActive: true,
      onboardingCompleted: false,
      claimsComplete: true,
      onboardingClaimsComplete: true,
    })
    expect(decision).toMatchObject({
      action: 'redirect',
      path: '/en/onboarding',
      metric: 'onboarding_redirected',
    })
  })

  it('allows incomplete onboarding on onboarding route', () => {
    const decision = decideProxyAuth({
      ...base,
      pathnameWithoutLocale: '/onboarding',
      userId: 'user-1',
      role: 'student',
      isActive: true,
      onboardingCompleted: false,
      claimsComplete: true,
      onboardingClaimsComplete: true,
    })
    expect(decision.action).toBe('allow')
  })

  it('allows complete student on dashboard', () => {
    const decision = decideProxyAuth({
      ...base,
      pathnameWithoutLocale: '/dashboard',
      userId: 'user-1',
      role: 'student',
      isActive: true,
      onboardingCompleted: true,
      claimsComplete: true,
      onboardingClaimsComplete: true,
    })
    expect(decision.action).toBe('allow')
  })

  it('denies student on admin route', () => {
    const decision = decideProxyAuth({
      ...base,
      pathnameWithoutLocale: '/admin',
      userId: 'user-1',
      role: 'student',
      isActive: true,
      onboardingCompleted: true,
      claimsComplete: true,
      onboardingClaimsComplete: true,
    })
    expect(decision).toMatchObject({ action: 'redirect', path: '/en/dashboard' })
  })

  it('redirects inactive users to account-suspended', () => {
    const decision = decideProxyAuth({
      ...base,
      pathnameWithoutLocale: '/dashboard',
      userId: 'user-1',
      role: 'student',
      isActive: false,
      onboardingCompleted: true,
      claimsComplete: true,
      onboardingClaimsComplete: true,
    })
    expect(decision).toMatchObject({ path: '/en/account-suspended' })
  })

  it('allows signed-in user on landing when onboarding complete', () => {
    const decision = decideProxyAuth({
      ...base,
      pathnameWithoutLocale: '/',
      userId: 'user-1',
      role: 'student',
      isActive: true,
      onboardingCompleted: true,
      claimsComplete: true,
      onboardingClaimsComplete: true,
    })
    expect(decision).toMatchObject({ action: 'allow' })
  })
})

describe('route helpers', () => {
  it('public anonymous routes', () => {
    expect(isPublicAnonymousRoute('/')).toBe(true)
    expect(isPublicAnonymousRoute('/login')).toBe(true)
    expect(isPublicAnonymousRoute('/courses')).toBe(true)
    expect(isPublicAnonymousRoute('/dashboard')).toBe(false)
  })

  it('isProtectedRoute is inverse of public anonymous', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true)
    expect(isProtectedRoute('/')).toBe(false)
  })
})
