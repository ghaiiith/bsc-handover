import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { buildPlatformClaims } from '@/lib/auth/claims-projection'
import type { UserRole } from '@/types'
import type { OnboardingAccountType } from '@/types/onboarding'

export interface SyncUserClaimsResult {
  ok: boolean
  userId: string
  role?: UserRole
  is_active?: boolean
  onboarding_completed?: boolean
  skipped?: boolean
  reason?: string
}

interface UserClaimsRow {
  id: string
  role: UserRole
  is_active: boolean
  account_type: OnboardingAccountType | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
}

async function fetchCanonicalUserRow(userId: string): Promise<UserClaimsRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select(
      'id, role, is_active, account_type, onboarding_completed, onboarding_completed_at'
    )
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[auth/claims] users lookup failed:', userId, error.message)
    return null
  }

  return data as UserClaimsRow | null
}

function claimsMatch(
  existing: Record<string, unknown>,
  next: Record<string, unknown>
): boolean {
  return (
    existing.role === next.role &&
    existing.is_active === next.is_active &&
    existing.account_type === next.account_type &&
    existing.onboarding_completed === next.onboarding_completed &&
    existing.onboarding_completed_at === next.onboarding_completed_at &&
    existing.claims_version === next.claims_version
  )
}

export async function syncUserAuthClaims(
  userId: string,
  options?: { incrementVersion?: boolean }
): Promise<SyncUserClaimsResult> {
  const incrementVersion = options?.incrementVersion ?? true

  try {
    const row = await fetchCanonicalUserRow(userId)
    if (!row) {
      return { ok: false, userId, reason: 'profile_not_found' }
    }

    const admin = createAdminClient()
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)

    if (authError || !authData.user) {
      console.error('[auth/claims] auth user lookup failed:', userId, authError?.message)
      return { ok: false, userId, reason: 'auth_user_not_found' }
    }

    const existing = (authData.user.app_metadata ?? {}) as Record<string, unknown>
    const nextClaims = buildPlatformClaims(existing, row, incrementVersion)

    if (claimsMatch(existing, nextClaims)) {
      return {
        ok: true,
        userId,
        role: row.role,
        is_active: row.is_active,
        onboarding_completed: row.onboarding_completed,
        skipped: true,
      }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: nextClaims,
    })

    if (updateError) {
      console.error('[auth/claims] update failed:', userId, updateError.message)
      return { ok: false, userId, reason: 'update_failed' }
    }

    return {
      ok: true,
      userId,
      role: row.role,
      is_active: row.is_active,
      onboarding_completed: row.onboarding_completed,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.error('[auth/claims] unexpected error:', userId, message)
    return { ok: false, userId, reason: 'unexpected_error' }
  }
}

export async function syncManyUserAuthClaims(
  userIds: string[],
  options?: { incrementVersion?: boolean }
): Promise<SyncUserClaimsResult[]> {
  const results: SyncUserClaimsResult[] = []
  for (const userId of userIds) {
    results.push(await syncUserAuthClaims(userId, options))
  }
  return results
}

export async function setUserRoleClaim(
  userId: string,
  role: UserRole
): Promise<SyncUserClaimsResult> {
  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ role }).eq('id', userId)
  if (error) {
    console.error('[auth/claims] role DB update failed:', userId, error.message)
    return { ok: false, userId, reason: 'db_update_failed' }
  }
  return syncUserAuthClaims(userId)
}

export async function setUserActiveClaim(
  userId: string,
  isActive: boolean
): Promise<SyncUserClaimsResult> {
  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ is_active: isActive }).eq('id', userId)
  if (error) {
    console.error('[auth/claims] is_active DB update failed:', userId, error.message)
    return { ok: false, userId, reason: 'db_update_failed' }
  }
  return syncUserAuthClaims(userId)
}

/** Sync JWT claims when canonical DB row may differ from auth app_metadata. */
export async function ensureUserAuthClaimsSynced(userId: string): Promise<SyncUserClaimsResult> {
  return syncUserAuthClaims(userId, { incrementVersion: false })
}
