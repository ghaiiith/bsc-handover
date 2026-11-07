import http from 'k6/http'
import { check, sleep } from 'k6'
import {
  BASE_URL,
  login,
  buildAuthCookies,
  applyCookies,
} from './lib/session.js'

/**
 * B/C/D. Authenticated navigation (student | instructor | admin).
 *
 * Proves the RBAC-claims win: after backfill, authenticated navigation should
 * be gated from JWT `app_metadata` alone. Watch server logs — you should see
 * mostly `{"event":"claims_used"}` and almost no `{"event":"db_fallback_used"}`.
 *
 * VUs log in ONCE in setup() and reuse the session cookie (no per-iteration
 * login — that would benchmark Supabase Auth, not the proxy).
 *
 *   k6 run -e BASE_URL=https://... -e SUPABASE_URL=https://xxx.supabase.co \
 *          -e SUPABASE_ANON_KEY=... -e ROLE=student \
 *          -e STUDENT_EMAIL=... -e STUDENT_PASSWORD=... \
 *          -e STAGE=smoke loadtest/k6/authenticated-navigation.js
 */

const ROLE = __ENV.ROLE || 'student'
const STAGE = __ENV.STAGE || 'smoke'

const FLOWS = {
  student: [
    '/ar/dashboard',
    '/ar/dashboard/my-courses',
    '/ar/dashboard/my-learning',
    '/ar/dashboard/profile',
  ],
  instructor: [
    '/ar/instructor/dashboard',
    '/ar/instructor/courses',
    '/ar/instructor/earnings',
    '/ar/instructor/discounts',
  ],
  admin: ['/ar/admin', '/ar/admin/users', '/ar/admin/courses', '/ar/admin/jobs'],
  company: ['/ar/dashboard', '/ar/dashboard/company-jobs'],
}

const STAGES = {
  smoke: [{ duration: '1m', target: 5 }],
  low: [{ duration: '30s', target: 25 }, { duration: '3m', target: 25 }, { duration: '30s', target: 0 }],
  medium: [{ duration: '1m', target: 100 }, { duration: '5m', target: 100 }, { duration: '1m', target: 0 }],
  high: [{ duration: '2m', target: 300 }, { duration: '10m', target: 300 }, { duration: '2m', target: 0 }],
}

export const options = {
  stages: STAGES[STAGE] || STAGES.smoke,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
}

export function setup() {
  const email = __ENV[`${ROLE.toUpperCase()}_EMAIL`]
  const password = __ENV[`${ROLE.toUpperCase()}_PASSWORD`]
  const session = login(email, password)
  const cookies = buildAuthCookies(session)

  // Self-check: the session must actually reach a protected page (not bounce
  // to /login). Fail fast with a clear message if cookie encoding is wrong.
  applyCookies(cookies)
  const probe = http.get(`${BASE_URL}${FLOWS[ROLE][0]}`, {
    redirects: 0,
    headers: { accept: 'text/html' },
  })
  if (probe.status >= 300 && probe.status < 400) {
    const loc = probe.headers['Location'] || ''
    if (loc.includes('/login')) {
      throw new Error(`Auth cookie rejected — probe redirected to login (${loc}).`)
    }
  }

  return { cookies }
}

export default function (data) {
  applyCookies(data.cookies)
  const flow = FLOWS[ROLE] || FLOWS.student

  for (const path of flow) {
    const res = http.get(`${BASE_URL}${path}`, {
      headers: { accept: 'text/html', 'user-agent': `k6-auth-${ROLE}` },
      tags: { page: path, role: ROLE },
    })

    check(res, {
      'not redirected to login': (r) =>
        !(r.status >= 300 && r.status < 400 && String(r.headers['Location'] || '').includes('/login')),
      'status ok': (r) => r.status === 200,
    })

    sleep(Math.random() * 2 + 1) // 1-3s think time
  }
}
