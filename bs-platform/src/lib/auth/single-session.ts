import 'server-only'

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Single-active-session enforcement (report BS-04).
 *
 * On each successful sign-in we rotate the account's session "epoch": a fresh
 * value is written to `public.users.current_session_id` (canonical) and mirrored
 * into the JWT `app_metadata.session_epoch`. The proxy compares the two on every
 * request — an older device carries the previous epoch and is signed out.
 */

/**
 * Generate a new session epoch, persist it as the canonical value, and project it
 * into the user's JWT app_metadata. Returns the new epoch, or null on failure.
 * The caller must refresh the current session afterwards so its JWT carries the
 * new epoch (otherwise the current device would supersede itself).
 */
export async function rotateSessionEpoch(userId: string): Promise<string | null> {
  const epoch = randomUUID()
  const admin = createAdminClient()

  const { error: dbError } = await admin
    .from('users')
    .update({ current_session_id: epoch })
    .eq('id', userId)

  if (dbError) {
    console.error('[auth/single-session] canonical update failed:', userId, dbError.message)
    return null
  }

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError || !authData.user) {
    console.error('[auth/single-session] auth lookup failed:', userId, authError?.message)
    return null
  }

  const existing = (authData.user.app_metadata ?? {}) as Record<string, unknown>
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...existing, session_epoch: epoch },
  })

  if (updateError) {
    console.error('[auth/single-session] app_metadata update failed:', userId, updateError.message)
    return null
  }

  return epoch
}

/**
 * Report BS-04 fix: pull the GoTrue `session_id` out of an access token. This is
 * a native JWT claim present from the moment of login, so enforcing on it needs
 * no token refresh — unlike the app_metadata epoch above, which is kept only for
 * backwards compatibility.
 */
export function extractSessionId(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    const claims = JSON.parse(json) as { session_id?: unknown }
    return typeof claims.session_id === 'string' && claims.session_id ? claims.session_id : null
  } catch {
    return null
  }
}

/**
 * Mark `sessionId` as the account's single blessed session (report BS-04).
 * Stored via the service-role client — `active_session_id` is not exposed to the
 * anon/authenticated column grants.
 */
export async function setActiveSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('users')
      .update({ active_session_id: sessionId })
      .eq('id', userId)
    if (error) {
      console.error('[auth/single-session] setActiveSession failed:', userId, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[auth/single-session] setActiveSession error:', err)
    return false
  }
}

/**
 * The account's blessed session id, or null when unset (enforcement disabled for
 * this user) or on error. Callers fail open so an infra hiccup never locks a
 * legitimate user out.
 */
export async function getActiveSessionId(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('users')
      .select('active_session_id')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('[auth/single-session] active read failed:', userId, error.message)
      return null
    }
    const value = data?.active_session_id
    return typeof value === 'string' && value ? value : null
  } catch (err) {
    console.error('[auth/single-session] active read error:', err)
    return null
  }
}

/**
 * Read the canonical session epoch for a user via the service-role client
 * (`current_session_id` is not exposed to the anon/authenticated column grants).
 * Returns null when unset or on error — callers must fail open so an infra hiccup
 * never locks a legitimate user out.
 */
export async function getCanonicalSessionEpoch(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('users')
      .select('current_session_id')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[auth/single-session] canonical read failed:', userId, error.message)
      return null
    }

    const value = data?.current_session_id
    return typeof value === 'string' && value ? value : null
  } catch (err) {
    console.error('[auth/single-session] canonical read error:', err)
    return null
  }
}
