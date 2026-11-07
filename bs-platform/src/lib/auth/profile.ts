import type { User as AuthUser, SupabaseClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAuthUser } from '@/lib/supabase/get-auth-user'
import { ensureUserAuthClaimsSynced } from '@/lib/auth/sync-user-claims'
import { isOnboardingCompleteForRole } from '@/lib/auth/claims-projection'
import { getDisplayName, profileFromAuthUser, mergeProfileWithClaims } from '@/lib/auth/profile-utils'
import type { User } from '@/types'

export { getDisplayName, profileFromAuthUser, mergeProfileWithClaims }

function logDbError(label: string, error: PostgrestError | null) {
  if (!error) return
  console.error(
    `[auth] ${label}:`,
    error.message,
    error.code,
    error.details,
    error.hint
  )
}

function hasAdminCredentials(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(
    key &&
      !key.startsWith('your_') &&
      key.length > 20
  )
}

// Admin (service-role) reads: bypasses the column grant, so select('*') is fine.
async function fetchProfileById(
  client: SupabaseClient,
  userId: string
): Promise<User | null> {
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) logDbError('fetchProfileById', error)
  return (data as User) ?? null
}

// Authenticated (cookie) self-read: email/phone are column-locked from the
// authenticated role (migration 044), so the own full row comes from the
// get_my_profile SECURITY DEFINER RPC instead of select('*').
async function fetchOwnProfileViaRpc(
  client: SupabaseClient
): Promise<User | null> {
  const { data, error } = await client.rpc('get_my_profile')
  if (error) logDbError('fetchOwnProfileViaRpc', error)
  // PostgREST may return a table-typed function result as a single object or as
  // a one-element array depending on version — normalize to a single row.
  const row = Array.isArray(data) ? data[0] : data
  return (row as User) ?? null
}

async function updateFullNameIfMissing(
  client: SupabaseClient,
  userId: string,
  fullName: string,
  existing: User
): Promise<User> {
  if (existing.full_name?.trim()) return existing

  // No RETURNING/select: the authenticated role cannot read email/phone, which a
  // `.select('*')` would require. We already hold the row, so merge locally.
  const { error } = await client
    .from('users')
    .update({ full_name: fullName })
    .eq('id', userId)

  if (error) {
    logDbError('updateFullNameIfMissing', error)
    return existing
  }

  return { ...existing, full_name: fullName }
}

/** Insert using the logged-in user's session (requires users_insert_own policy). */
async function ensureWithUserClient(
  authUser: AuthUser,
  fullName: string
): Promise<User | null> {
  const supabase = await createClient()

  const existing = await fetchOwnProfileViaRpc(supabase)
  if (existing) {
    return updateFullNameIfMissing(supabase, authUser.id, fullName, existing)
  }

  // No RETURNING/select on insert: the authenticated role cannot read email/phone.
  // Insert, then read the row back through the own-profile RPC.
  const { error } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email!,
      full_name: fullName,
    })

  if (!error) {
    const created = await fetchOwnProfileViaRpc(supabase)
    if (created) {
      await ensureUserAuthClaimsSynced(authUser.id)
      return created
    }
  }

  // Row already created by trigger between our read and insert
  if (error?.code === '23505') {
    const refetched = await fetchOwnProfileViaRpc(supabase)
    if (refetched) {
      return updateFullNameIfMissing(supabase, authUser.id, fullName, refetched)
    }
  }

  logDbError('ensureWithUserClient insert', error ?? null)
  return null
}

export async function ensureUserProfile(authUser: AuthUser): Promise<User | null> {
  const fullName = getDisplayName(null, authUser)

  if (!hasAdminCredentials()) {
    console.warn(
      '[auth] SUPABASE_SERVICE_ROLE_KEY missing or invalid — using session client for profile sync'
    )
    return ensureWithUserClient(authUser, fullName)
  }

  const admin = createAdminClient()

  const existing = await fetchProfileById(admin, authUser.id)
  if (existing) {
    return updateFullNameIfMissing(admin, authUser.id, fullName, existing)
  }

  // Insert only — never upsert, so an existing admin/instructor role cannot be reset.
  const { error: insertError } = await admin.from('users').insert({
    id: authUser.id,
    email: authUser.email!,
    full_name: fullName,
  })

  if (!insertError) {
    const created = await fetchProfileById(admin, authUser.id)
    if (created) {
      await ensureUserAuthClaimsSynced(authUser.id)
      return created
    }
  }

  if (insertError?.code === '23505') {
    const refetched = await fetchProfileById(admin, authUser.id)
    if (refetched) {
      return updateFullNameIfMissing(admin, authUser.id, fullName, refetched)
    }
  }

  logDbError('ensureUserProfile insert', insertError)

  // Last resort: try with the user's own session + RLS insert policy
  return ensureWithUserClient(authUser, fullName)
}

export async function getSessionProfile(): Promise<{
  authUser: AuthUser
  profile: User
} | null> {
  const supabase = await createClient()
  const authUser = await resolveAuthUser(supabase)

  if (!authUser) return null

  let profile = await fetchOwnProfileViaRpc(supabase)

  if (!profile) {
    profile = await ensureUserProfile(authUser)
  } else if (!profile.full_name?.trim()) {
    profile = await ensureUserProfile(authUser)
  }

  const merged = mergeProfileWithClaims(profile ?? profileFromAuthUser(authUser), authUser)

  return {
    authUser,
    profile: merged,
  }
}

/** Whether the user may access post-onboarding routes (DB row or JWT claims). */
export function isProfileOnboardingComplete(profile: User): boolean {
  return isOnboardingCompleteForRole(
    profile.role ?? 'student',
    profile.onboarding_completed === true
  )
}
