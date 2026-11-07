import { describe, expect, it } from 'vitest'
import {
  buildPlatformClaims,
  profileStatusFromActive,
} from '@/lib/auth/claims-projection'

const baseRow = {
  role: 'student' as const,
  is_active: true,
  account_type: 'student' as const,
  onboarding_completed: true,
  onboarding_completed_at: null,
}

describe('profileStatusFromActive', () => {
  it('maps active/inactive to profile_status', () => {
    expect(profileStatusFromActive(true)).toBe('active')
    expect(profileStatusFromActive(false)).toBe('suspended')
  })
})

describe('buildPlatformClaims', () => {
  it('projects role, active, and onboarding from canonical source', () => {
    const claims = buildPlatformClaims({}, baseRow, true)
    expect(claims.role).toBe('student')
    expect(claims.is_active).toBe(true)
    expect(claims.account_type).toBe('student')
    expect(claims.onboarding_completed).toBe(true)
    expect(claims.profile_status).toBe('active')
    expect(claims.claims_version).toBe(1)
  })

  it('marks suspended users', () => {
    const claims = buildPlatformClaims(
      { ...baseRow, claims_version: 3 },
      { ...baseRow, is_active: false },
      true
    )
    expect(claims.is_active).toBe(false)
    expect(claims.profile_status).toBe('suspended')
    expect(claims.claims_version).toBe(4)
  })

  it('increments claims_version on onboarding change', () => {
    const claims = buildPlatformClaims(
      { ...baseRow, onboarding_completed: false, claims_version: 2 },
      baseRow,
      true
    )
    expect(claims.onboarding_completed).toBe(true)
    expect(claims.claims_version).toBe(3)
  })

  it('preserves unrelated app_metadata keys', () => {
    const claims = buildPlatformClaims(
      { provider: 'google', custom_flag: 42 },
      { ...baseRow, role: 'company', account_type: 'company' },
      true
    )
    expect(claims.provider).toBe('google')
    expect(claims.custom_flag).toBe(42)
    expect(claims.role).toBe('company')
  })

  it('handles null account_type for incomplete onboarding', () => {
    const claims = buildPlatformClaims(
      {},
      { ...baseRow, account_type: null, onboarding_completed: false },
      true
    )
    expect(claims.account_type).toBeNull()
    expect(claims.onboarding_completed).toBe(false)
  })
})
