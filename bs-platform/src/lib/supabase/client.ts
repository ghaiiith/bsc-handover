import { createBrowserClient } from '@supabase/ssr'
import { createTimeoutFetch } from '@/lib/supabase/fetch'

// Singleton: the browser client holds auth state and starts a token-refresh
// loop on init. Creating a new one per call (as several components do) spawns
// duplicate refresh loops — extra network churn and, when Auth is unreachable,
// a storm of AuthRetryableFetchError logs. One shared instance avoids that.
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: createTimeoutFetch() } }
  )
}

// Non-generic factory above keeps the concrete client type (a direct annotation
// with `ReturnType<typeof createBrowserClient>` would widen callbacks to `any`).
let browserClient: ReturnType<typeof makeClient> | undefined

export function createClient() {
  browserClient ??= makeClient()
  return browserClient
}
