import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createTimeoutFetch } from '@/lib/supabase/fetch'

/**
 * Cookie-less, anonymous Supabase client for public (RLS-guarded) reads.
 *
 * Unlike the SSR client in `server.ts`, this reads no cookies/headers, so it is
 * safe to use inside `unstable_cache` and does not force a route into dynamic
 * rendering. Only data readable under the anonymous RLS role is accessible.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: createTimeoutFetch() },
    }
  )
}
