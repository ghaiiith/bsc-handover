import { createServerClient } from '@supabase/ssr/dist/module/createServerClient'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import {
  decideProxyAuth,
  isPublicAnonymousRoute,
  parseJwtRbacClaims,
} from '@/lib/auth/proxy-rbac'
import { logProxyAuthMetric, type ProxyAuthMetricEvent } from '@/lib/auth/proxy-rbac-metrics'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { extractSessionId, getActiveSessionId } from '@/lib/auth/single-session'
import {
  isStaleSessionError,
  isTransientNetworkError,
} from '@/lib/auth/session-errors'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createTimeoutFetch } from '@/lib/supabase/fetch'
import type { UserRole } from '@/types'
import type { PlatformAuthClaims } from '@/types/auth-claims'
import type { OnboardingAccountType } from '@/types/onboarding'

const intlMiddleware = createIntlMiddleware(routing)

const MAINTENANCE_TTL_MS = 30_000
let maintenanceCache: { value: boolean; expires: number } | null = null

async function isMaintenanceMode(
  supabase: ReturnType<typeof createServerClient>
): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && maintenanceCache.expires > now) {
    return maintenanceCache.value
  }

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .maybeSingle()

  const value = data?.value === 'true'
  maintenanceCache = { value, expires: now + MAINTENANCE_TTL_MS }
  return value
}

const AUTH_TIMEOUT_MS = 3_000

/**
 * Next.js App Router speculative prefetches (Link hover / viewport prefetch) and
 * browser prefetches. Report BS-04 fix: these must never mutate session state —
 * a prefetch that signs the user out clears the auth cookie in the browser, and
 * right after login the page prefetches its own links while the browser still
 * holds a JWT carrying the previous session epoch, so the user's own fresh login
 * would supersede itself. The real navigation still enforces the epoch.
 */
function isPrefetchRequest(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    (request.headers.get('sec-purpose') ?? '').includes('prefetch')
  )
}

/**
 * Report BS-04 fix: read the GoTrue `session_id` out of the Supabase auth cookie
 * without a network call. The cookie is `base64-<json>` (chunked across `.0`,
 * `.1`, … when large); the JSON holds the access token, whose `session_id` claim
 * is the identity we enforce single-session on.
 */
function extractSessionIdFromRequest(request: NextRequest): string | null {
  const chunks = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith('sb-') && /-auth-token(\.\d+)?$/.test(c.name))
  if (chunks.length === 0) return null

  chunks.sort((a, b) => {
    const ai = a.name.match(/\.(\d+)$/)
    const bi = b.name.match(/\.(\d+)$/)
    return (ai ? Number(ai[1]) : -1) - (bi ? Number(bi[1]) : -1)
  })

  let raw = chunks.map((c) => c.value).join('')
  try {
    raw = decodeURIComponent(raw)
  } catch {
    /* value was not encoded */
  }
  if (raw.startsWith('base64-')) raw = raw.slice(7)

  try {
    const session = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
      access_token?: string
    }
    return extractSessionId(session.access_token)
  } catch {
    return null
  }
}

function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
  )
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

function scheduleClaimsBackfill(userId: string): void {
  void syncUserAuthClaims(userId).catch(() => {
    /* logged inside helper */
  })
}

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request)

  const pathname = request.nextUrl.pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(ar|en)/, '') || '/'
  const locale = pathname.split('/')[1] || 'ar'

  if (isPublicAnonymousRoute(pathnameWithoutLocale) && !hasSupabaseAuthCookies(request)) {
    logProxyAuthMetric('public_landing_allowed', { path: pathnameWithoutLocale })
    return response
  }

  if (!isSupabaseConfigured()) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: createTimeoutFetch(AUTH_TIMEOUT_MS) },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let userId: string | null = null
  let role: UserRole | null = null
  let isActive: boolean | null = null
  let onboardingCompleted: boolean | null = null
  let claimsComplete = false
  let onboardingClaimsComplete = false
  let dbFallbackUsed = false
  let dbFallbackFailed = false
  let sessionCleared = false

  const hasAuthCookies = hasSupabaseAuthCookies(request)

  function applyClaimsFromMetadata(
    sub: string,
    appMetadata: PlatformAuthClaims | Record<string, unknown> | undefined
  ): void {
    userId = sub
    const parsed = parseJwtRbacClaims(appMetadata)
    role = parsed.role
    isActive = parsed.isActive
    onboardingCompleted = parsed.onboardingCompleted
    claimsComplete = parsed.claimsComplete
    onboardingClaimsComplete = parsed.onboardingClaimsComplete
    if (claimsComplete) {
      logProxyAuthMetric('claims_used', { path: pathnameWithoutLocale, role })
    } else {
      logProxyAuthMetric('claims_missing', { path: pathnameWithoutLocale })
    }
  }

  if (hasAuthCookies) {
    try {
      const userResult = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS, null)
      if (userResult !== null) {
        const {
          data: { user },
          error,
        } = userResult
        if (user) {
          applyClaimsFromMetadata(
            user.id,
            user.app_metadata as PlatformAuthClaims | undefined
          )
        } else if (error && isStaleSessionError(error.message)) {
          console.warn('[proxy] stale session — signing out:', error.message)
          await supabase.auth.signOut()
          sessionCleared = true
          logProxyAuthMetric('claims_stale', { path: pathnameWithoutLocale })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      if (isStaleSessionError(message)) {
        console.warn('[proxy] stale session — signing out:', message)
        await supabase.auth.signOut()
        sessionCleared = true
        logProxyAuthMetric('claims_stale', { path: pathnameWithoutLocale })
      } else if (!isTransientNetworkError(message)) {
        console.error('[proxy] auth.getUser failed:', message)
      }
    }
  }

  if (!userId && hasAuthCookies && !sessionCleared) {
    try {
      const result = await withTimeout(supabase.auth.getClaims(), AUTH_TIMEOUT_MS, null)
      if (result === null) {
        console.warn('[proxy] auth.getClaims timed out — treating request as anonymous')
      } else {
        const { data, error } = result
        if (!error && data?.claims?.sub) {
          applyClaimsFromMetadata(
            data.claims.sub as string,
            data.claims.app_metadata as PlatformAuthClaims | undefined
          )
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      if (isTransientNetworkError(message)) {
        console.warn('[proxy] auth.getClaims transient network error:', message)
      } else {
        console.error('[proxy] auth.getClaims failed:', message)
      }
    }
  }

  if (userId && (!claimsComplete || onboardingCompleted === null)) {
    dbFallbackUsed = true
    logProxyAuthMetric('db_fallback_used', { path: pathnameWithoutLocale })

    const profile = await withTimeout(
      (async () => {
        const { data } = await supabase
          .from('users')
          .select('role, is_active, onboarding_completed, account_type')
          .eq('id', userId)
          .maybeSingle()
        return data
      })(),
      AUTH_TIMEOUT_MS,
      null
    )

    if (profile) {
      role = profile.role as UserRole
      isActive = profile.is_active !== false
      onboardingCompleted =
        typeof profile.onboarding_completed === 'boolean'
          ? profile.onboarding_completed
          : false
      claimsComplete = role !== null && isActive !== null
      onboardingClaimsComplete =
        claimsComplete &&
        (role === 'admin' || typeof profile.onboarding_completed === 'boolean')
      void (profile.account_type as OnboardingAccountType | null)
      logProxyAuthMetric('claims_sync_scheduled', { path: pathnameWithoutLocale, role })
      scheduleClaimsBackfill(userId)
    } else {
      dbFallbackFailed = true
      logProxyAuthMetric('db_fallback_failed', { path: pathnameWithoutLocale })
    }
  }

  // Single active session (report BS-04): every access token natively carries the
  // GoTrue `session_id` of the login that issued it. If a newer device has signed
  // in, the stored blessed session id differs and this (older) session is
  // terminated. `active_session_id` is NULL until the user logs in after this
  // feature deployed, so enforcement is opt-in per user and never disrupts an
  // existing session. Fail-open on a read miss/timeout.
  // Admins are EXEMPT: the platform is run by more than one administrator and
  // they share operational work, so enforcing one session per account made them
  // sign each other out constantly ("ماكدر ادخل"). Single-session exists to stop
  // students sharing a paid account — that reason does not apply to staff.
  if (userId && !sessionCleared && role !== 'admin') {
    const jwtSessionId = extractSessionIdFromRequest(request)
    if (jwtSessionId) {
      const activeSessionId = await withTimeout(
        getActiveSessionId(userId),
        AUTH_TIMEOUT_MS,
        null
      )
      if (activeSessionId && activeSessionId !== jwtSessionId) {
        // A speculative prefetch must not clear cookies (see isPrefetchRequest):
        // return an empty 401 without touching the session so the real
        // navigation is the one that enforces single-session.
        if (isPrefetchRequest(request)) {
          logProxyAuthMetric('session_superseded_prefetch_skipped', {
            path: pathnameWithoutLocale,
          })
          return new NextResponse(null, { status: 401 })
        }
        // scope:'local' is critical here: this signs out ONLY the superseded
        // device. The default scope ('global') would revoke every session for the
        // account server-side — including the freshly-blessed session on the new
        // device — so a stale tab hitting the proxy once would nuke the login that
        // just superseded it, looping the user back to /login (report BS-04).
        await supabase.auth.signOut({ scope: 'local' })
        sessionCleared = true
        logProxyAuthMetric('session_superseded', { path: pathnameWithoutLocale })
        if (request.method === 'GET') {
          return NextResponse.redirect(
            new URL(`/${locale}/login?signed_out=other_device`, request.url)
          )
        }
        return response
      }
    }
  }

  let isMaintenance = false
  if (
    userId &&
    role !== 'admin' &&
    !pathnameWithoutLocale.startsWith('/admin') &&
    !pathnameWithoutLocale.startsWith('/maintenance') &&
    !pathnameWithoutLocale.startsWith('/login')
  ) {
    isMaintenance = await withTimeout(isMaintenanceMode(supabase), AUTH_TIMEOUT_MS, false)
  }

  const decision = decideProxyAuth({
    pathnameWithoutLocale,
    locale,
    userId,
    role,
    isActive,
    onboardingCompleted,
    claimsComplete,
    onboardingClaimsComplete,
    dbFallbackUsed,
    dbFallbackFailed,
    isMaintenance,
  })

  if (decision.action === 'redirect') {
    // Never redirect non-GET requests: server actions POST to the current URL
    // (e.g. the login page right after sign-in), and redirecting them makes the
    // client router render the redirect target under the stale URL. The actions
    // themselves enforce auth server-side.
    if (request.method !== 'GET') {
      return response
    }
    if (decision.metric) {
      logProxyAuthMetric(decision.metric as ProxyAuthMetricEvent, {
        path: pathnameWithoutLocale,
        reason: decision.reason,
        role,
      })
    }
    return NextResponse.redirect(new URL(decision.path, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
