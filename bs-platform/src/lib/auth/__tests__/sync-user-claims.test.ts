import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mock the service-role admin client so the sync helper can be exercised
 * without network I/O. `server-only` is aliased to a no-op in vitest.config.ts.
 */

interface MockState {
  userRow: {
    id: string
    role: string
    is_active: boolean
    account_type: string | null
    onboarding_completed: boolean
    onboarding_completed_at: string | null
  } | null
  userRowError: { message: string } | null
  authUser: { app_metadata: Record<string, unknown> } | null
  authError: { message: string } | null
  updateError: { message: string } | null
  updateArg: { app_metadata: Record<string, unknown> } | null
  usersUpdate: { error: { message: string } | null; captured?: Record<string, unknown> }
}

const state: MockState = {
  userRow: null,
  userRowError: null,
  authUser: null,
  authError: null,
  updateError: null,
  updateArg: null,
  usersUpdate: { error: null },
}

function makeAdminClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: state.userRow, error: state.userRowError }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          state.usersUpdate.captured = values
          return { error: state.usersUpdate.error }
        },
      }),
    }),
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: state.authUser },
          error: state.authError,
        }),
        updateUserById: async (
          _id: string,
          payload: { app_metadata: Record<string, unknown> }
        ) => {
          state.updateArg = payload
          return { error: state.updateError }
        },
      },
    },
  }
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => makeAdminClient(),
}))

import {
  syncUserAuthClaims,
  setUserRoleClaim,
} from '@/lib/auth/sync-user-claims'

beforeEach(() => {
  state.userRow = null
  state.userRowError = null
  state.authUser = null
  state.authError = null
  state.updateError = null
  state.updateArg = null
  state.usersUpdate = { error: null }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('syncUserAuthClaims', () => {
  it('projects role/is_active to app_metadata (normal sync)', async () => {
    state.userRow = {
      id: 'u1',
      role: 'student',
      is_active: true,
      account_type: 'student',
      onboarding_completed: true,
      onboarding_completed_at: null,
    }
    state.authUser = { app_metadata: {} }

    const result = await syncUserAuthClaims('u1')

    expect(result.ok).toBe(true)
    expect(result.role).toBe('student')
    expect(state.updateArg?.app_metadata.role).toBe('student')
    expect(state.updateArg?.app_metadata.is_active).toBe(true)
    expect(state.updateArg?.app_metadata.profile_status).toBe('active')
  })

  it('projects suspended status (suspended sync)', async () => {
    state.userRow = {
      id: 'u1',
      role: 'student',
      is_active: false,
      account_type: null,
      onboarding_completed: false,
      onboarding_completed_at: null,
    }
    state.authUser = { app_metadata: { role: 'student', is_active: true, claims_version: 1 } }

    const result = await syncUserAuthClaims('u1')

    expect(result.ok).toBe(true)
    expect(state.updateArg?.app_metadata.is_active).toBe(false)
    expect(state.updateArg?.app_metadata.profile_status).toBe('suspended')
  })

  it('preserves unrelated app_metadata keys', async () => {
    state.userRow = {
      id: 'u1',
      role: 'instructor',
      is_active: true,
      account_type: 'instructor',
      onboarding_completed: true,
      onboarding_completed_at: null,
    }
    state.authUser = {
      app_metadata: { provider: 'google', providers: ['google'], role: 'student', is_active: true },
    }

    await syncUserAuthClaims('u1')

    expect(state.updateArg?.app_metadata.provider).toBe('google')
    expect(state.updateArg?.app_metadata.providers).toEqual(['google'])
    expect(state.updateArg?.app_metadata.role).toBe('instructor')
  })

  it('fails safe when the profile row is missing', async () => {
    state.userRow = null
    state.authUser = { app_metadata: {} }

    const result = await syncUserAuthClaims('missing')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('profile_not_found')
    expect(state.updateArg).toBeNull()
  })

  it('fails when the auth user cannot be found', async () => {
    state.userRow = {
      id: 'u1',
      role: 'student',
      is_active: true,
      account_type: 'student',
      onboarding_completed: true,
      onboarding_completed_at: null,
    }
    state.authUser = null
    state.authError = { message: 'not found' }

    const result = await syncUserAuthClaims('u1')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('auth_user_not_found')
    expect(state.updateArg).toBeNull()
  })

  it('reports update failures without throwing', async () => {
    state.userRow = {
      id: 'u1',
      role: 'student',
      is_active: true,
      account_type: 'student',
      onboarding_completed: true,
      onboarding_completed_at: null,
    }
    state.authUser = { app_metadata: {} }
    state.updateError = { message: 'auth down' }

    const result = await syncUserAuthClaims('u1')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('update_failed')
  })

  it('skips the Auth write when nothing changed', async () => {
    const completedAt = '2024-01-01T00:00:00.000Z'
    state.userRow = {
      id: 'u1',
      role: 'admin',
      is_active: true,
      account_type: null,
      onboarding_completed: true,
      onboarding_completed_at: completedAt,
    }
    state.authUser = {
      app_metadata: {
        role: 'admin',
        is_active: true,
        account_type: null,
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
        claims_version: 1,
      },
    }

    const result = await syncUserAuthClaims('u1', { incrementVersion: false })

    expect(result.ok).toBe(true)
    expect(result.skipped).toBe(true)
    expect(state.updateArg).toBeNull()
  })
})

describe('setUserRoleClaim', () => {
  it('updates the DB role then syncs claims', async () => {
    state.userRow = {
      id: 'u1',
      role: 'instructor',
      is_active: true,
      account_type: 'instructor',
      onboarding_completed: true,
      onboarding_completed_at: null,
    }
    state.authUser = { app_metadata: { role: 'student', is_active: true } }

    const result = await setUserRoleClaim('u1', 'instructor')

    expect(state.usersUpdate.captured).toEqual({ role: 'instructor' })
    expect(result.ok).toBe(true)
    expect(state.updateArg?.app_metadata.role).toBe('instructor')
  })

  it('fails safe when the DB role update fails', async () => {
    state.usersUpdate.error = { message: 'db down' }

    const result = await setUserRoleClaim('u1', 'instructor')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('db_update_failed')
    expect(state.updateArg).toBeNull()
  })
})
