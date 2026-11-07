import http from 'k6/http'
import encoding from 'k6/encoding'

/**
 * Shared auth helpers for authenticated k6 load tests.
 *
 * Strategy: log in ONCE per role in `setup()` against Supabase GoTrue
 * (password grant), then reconstruct the `@supabase/ssr` auth cookie so every
 * VU can reuse the session. VUs never re-login — that would benchmark Supabase
 * Auth, not proxy navigation scalability.
 *
 * Required env vars:
 *   BASE_URL              e.g. https://platform-12.vercel.app
 *   SUPABASE_URL          e.g. https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY     public anon key (safe to use client-side)
 *   <ROLE>_EMAIL / <ROLE>_PASSWORD  per test account (never commit these)
 *
 * NOTE: never hardcode passwords. Pass via `-e` or an env file k6 reads.
 */

export const BASE_URL = (__ENV.BASE_URL || 'https://platform-12.vercel.app').replace(/\/$/, '')
const SUPABASE_URL = (__ENV.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''

// @supabase/ssr chunk boundary. Values longer than this are split into
// `<name>.0`, `<name>.1`, ... cookies; shorter values use `<name>` directly.
const MAX_CHUNK_SIZE = 3180

function projectRef() {
  // https://<ref>.supabase.co -> <ref>
  const host = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
  return host
}

/** Password-grant login. Returns the GoTrue session object or throws. */
export function login(email, password) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY env vars are required for auth tests')
  }
  if (!email || !password) {
    throw new Error('Missing email/password for a test account (check env vars)')
  }

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${String(res.body).slice(0, 200)}`)
  }

  return JSON.parse(res.body)
}

/**
 * Build the cookie name/value pairs the app's @supabase/ssr server client reads.
 * Mirrors ssr's `base64-` prefix + base64url(session JSON) + chunking.
 */
export function buildAuthCookies(session) {
  const ref = projectRef()
  const name = `sb-${ref}-auth-token`

  const payload = {
    access_token: session.access_token,
    token_type: session.token_type || 'bearer',
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  }

  const value = `base64-${encoding.b64encode(JSON.stringify(payload), 'rawurl')}`

  if (value.length <= MAX_CHUNK_SIZE) {
    return [{ name, value }]
  }

  const chunks = []
  for (let i = 0, idx = 0; i < value.length; i += MAX_CHUNK_SIZE, idx += 1) {
    chunks.push({ name: `${name}.${idx}`, value: value.slice(i, i + MAX_CHUNK_SIZE) })
  }
  return chunks
}

/** Apply cookies to the per-VU jar so protected requests carry the session. */
export function applyCookies(cookies) {
  const jar = http.cookieJar()
  for (const c of cookies) {
    jar.set(BASE_URL, c.name, c.value)
  }
}

/**
 * setup() helper: log in a set of roles and return their cookie bundles.
 * roles = { student: {email,password}, instructor: {...}, ... }
 */
export function loginRoles(roles) {
  const out = {}
  for (const [role, creds] of Object.entries(roles)) {
    if (!creds || !creds.email) continue
    const session = login(creds.email, creds.password)
    out[role] = buildAuthCookies(session)
  }
  return out
}

export function rolesFromEnv() {
  return {
    student: { email: __ENV.STUDENT_EMAIL, password: __ENV.STUDENT_PASSWORD },
    instructor: { email: __ENV.INSTRUCTOR_EMAIL, password: __ENV.INSTRUCTOR_PASSWORD },
    admin: { email: __ENV.ADMIN_EMAIL, password: __ENV.ADMIN_PASSWORD },
    company: { email: __ENV.COMPANY_EMAIL, password: __ENV.COMPANY_PASSWORD },
  }
}
