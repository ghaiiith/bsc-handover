'use client'

import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function isTransientAuthError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError' || error.name === 'TimeoutError'
  }
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('Supabase request timed out') ||
      error.message.includes('fetch failed') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('aborted') ||
      error.message.includes('ConnectTimeout') ||
      error.message.includes('UND_ERR_CONNECT_TIMEOUT')
    )
  }
  return false
}

const BROWSER_AUTH_TIMEOUT_MS = 4_000

/** Never throws — safe for client effects when Supabase Auth is slow/unreachable. */
export async function getBrowserAuthUser(): Promise<User | null> {
  return withClientTimeout(
    (async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          if (isTransientAuthError(error)) return null
          return null
        }

        return user
      } catch (error) {
        if (isTransientAuthError(error)) return null
        return null
      }
    })(),
    BROWSER_AUTH_TIMEOUT_MS,
    null
  )
}

/** Race a promise against a timeout; the underlying promise never causes unhandled rejections. */
export function withClientTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T
): Promise<T> {
  const guarded = Promise.resolve(promise).catch(() => fallback)
  return Promise.race([
    guarded,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}
