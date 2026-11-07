import 'server-only'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import {
  isExpectedUnauthenticatedError,
  isStaleSessionError,
  isTransientNetworkError,
} from '@/lib/auth/session-errors'

export { isTransientNetworkError } from '@/lib/auth/session-errors'

function userFromJwtClaims(claims: Record<string, unknown>): User {
  return {
    id: claims.sub as string,
    email: (claims.email as string | undefined) ?? '',
    app_metadata: (claims.app_metadata as Record<string, unknown> | undefined) ?? {},
    user_metadata: (claims.user_metadata as Record<string, unknown> | undefined) ?? {},
    aud: 'authenticated',
    created_at: '',
  } as User
}

/** Clear cookies when the JWT references a deleted or revoked auth user. */
export async function clearStaleSupabaseSession(
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch {
    /* best-effort */
  }
}

/**
 * Resolve the signed-in user: prefer validated `getUser()`, then cookie session /
 * local JWT claims only on transient network failures (never for stale sessions).
 */
export async function resolveAuthUser(
  supabase?: SupabaseClient
): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const client = supabase ?? (await createClient())

  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser()

    if (user) return user

    if (error) {
      if (isStaleSessionError(error.message)) {
        console.warn('[auth] stale session — signing out:', error.message)
        await clearStaleSupabaseSession(client)
        return null
      }

      if (isTransientNetworkError(error.message)) {
        console.warn(
          '[auth] getUser transient network error — trying session fallback:',
          error.message
        )
      } else if (!isExpectedUnauthenticatedError(error.message)) {
        console.error('[auth] getUser:', error.message)
        return null
      } else {
        return null
      }
    } else {
      return null
    }

    const {
      data: { session },
    } = await client.auth.getSession()
    if (session?.user) return session.user

    const { data: claimsData, error: claimsError } = await client.auth.getClaims()
    if (!claimsError && claimsData?.claims?.sub) {
      return userFromJwtClaims(claimsData.claims as Record<string, unknown>)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    if (isStaleSessionError(message)) {
      console.warn('[auth] stale session — signing out:', message)
      await clearStaleSupabaseSession(client)
      return null
    }
    if (isTransientNetworkError(message)) {
      console.warn('[auth] resolveAuthUser transient network error:', message)
    } else if (!isExpectedUnauthenticatedError(message)) {
      console.error('[auth] resolveAuthUser failed:', message)
    }
  }

  return null
}

/** Resilient auth lookup for layouts — never throws on network failures. */
export async function getAuthUser(): Promise<User | null> {
  return resolveAuthUser()
}
