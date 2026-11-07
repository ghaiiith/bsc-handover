'use server'

import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/auth/profile'
import { ensureUserAuthClaimsSynced } from '@/lib/auth/sync-user-claims'

export async function syncUserProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'not_authenticated' as const }
  }

  const profile = await ensureUserProfile(user)
  if (!profile) {
    return { error: 'profile_sync_failed' as const }
  }

  // Report BS-04 login fix: only mutate app_metadata here — do NOT refresh the
  // session server-side. During password login the browser client owns the
  // session; a server-side refresh rotates the refresh token out from under it,
  // so the client can never pull in the new claims/epoch and every navigation is
  // superseded back to /login. The client issues one refresh after all the
  // server-side metadata writes (claims + session epoch) are done.
  await ensureUserAuthClaimsSynced(user.id)

  return { profile }
}
