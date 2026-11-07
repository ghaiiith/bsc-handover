'use server'

import { createClient } from '@/lib/supabase/server'
import { ensureUserAuthClaimsSynced } from '@/lib/auth/sync-user-claims'
import { extractSessionId, setActiveSession } from '@/lib/auth/single-session'

export async function refreshAuthSessionAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.refreshSession()
  return { ok: !error }
}

/** After login/profile sync — align JWT app_metadata with public.users. */
export async function syncAndRefreshAuthClaims(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false }
  }

  const sync = await ensureUserAuthClaimsSynced(user.id)
  if (!sync.ok) {
    return { ok: false }
  }

  const { error } = await supabase.auth.refreshSession()
  return { ok: !error }
}

/**
 * Establish this device as the account's single active session (report BS-04).
 * Rotates the session epoch, refreshes the current JWT so it carries the new
 * epoch, then revokes every OTHER device's refresh token. Any previously
 * signed-in device now fails the proxy's epoch check and is signed out.
 *
 * Best-effort: a failure never blocks the user from completing sign-in.
 *
 * `freshSessionId` is the `session_id` the client extracted from the token
 * `signInWithPassword` just returned. Pass it: a server action running right
 * after sign-in can still see the PREVIOUS auth cookie (propagation race), so
 * re-reading the session id server-side would bless the stale login and the
 * proxy would immediately supersede this fresh one — the "logs in once, then
 * can't log in again" loop. `getSession()` is still used for the user id, which
 * is identical across both sessions (same account), so the race can't corrupt it.
 */
export async function establishSingleSession(
  freshSessionId?: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return { ok: false }
  }

  // Report BS-04 fix: bless THIS login's GoTrue session id. Prefer the id the
  // client pulled from the just-issued access token; only fall back to the
  // cookie-derived id when the client did not supply one. No token rotation or
  // refresh is needed — that is what previously made a fresh login supersede
  // itself. The proxy signs out any device whose JWT session_id differs.
  const sessionId = freshSessionId || extractSessionId(session.access_token)
  if (!sessionId) {
    return { ok: false }
  }

  const stored = await setActiveSession(session.user.id, sessionId)
  if (!stored) {
    return { ok: false }
  }

  // NB: we deliberately do NOT call signOut({ scope: 'others' }) here. In the
  // brief window right after sign-in the server can still hold the PREVIOUS
  // session cookie (propagation lag); GoTrue then treats that stale session as
  // "current" and scope:'others' revokes the FRESH login's tokens instead — so
  // the very next request fails auth and the user loops back to /login. The
  // proxy already enforces single-session on every request by comparing the
  // request's JWT session_id to `active_session_id`, so other devices are shut
  // out without any server-side token revocation here (report BS-04).
  return { ok: true }
}
