import http from 'k6/http'
import { check, sleep } from 'k6'
import {
  BASE_URL,
  login,
  buildAuthCookies,
  applyCookies,
} from './lib/session.js'

/**
 * E. Mixed realistic scenario.
 *
 *   70% anonymous public browsing
 *   20% authenticated student navigation
 *    5% instructor/admin navigation
 *    5% light API/interaction (public GET endpoints only)
 *
 * Excludes heavy AI and video streaming by design (test those separately).
 * After backfill, `db_fallback_used` should stay near zero across the run.
 *
 *   k6 run -e BASE_URL=https://... -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... \
 *          -e STUDENT_EMAIL=... -e STUDENT_PASSWORD=... \
 *          -e INSTRUCTOR_EMAIL=... -e INSTRUCTOR_PASSWORD=... \
 *          -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... \
 *          -e STAGE=smoke loadtest/k6/mixed-platform.js
 */

const STAGE = __ENV.STAGE || 'smoke'

const PUBLIC_PATHS = ['/ar', '/ar/courses', '/ar/jobs', '/ar/services', '/ar/community']
const STUDENT_PATHS = ['/ar/dashboard', '/ar/dashboard/my-courses', '/ar/dashboard/my-learning']
const INSTRUCTOR_PATHS = ['/ar/instructor/dashboard', '/ar/instructor/courses']
const ADMIN_PATHS = ['/ar/admin', '/ar/admin/users']
const API_PATHS = ['/api/search?q=react', '/api/recommendations']

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
    http_req_duration: ['p(95)<1000'],
  },
}

function loginOptional(role) {
  const email = __ENV[`${role.toUpperCase()}_EMAIL`]
  const password = __ENV[`${role.toUpperCase()}_PASSWORD`]
  if (!email || !password) return null
  try {
    return buildAuthCookies(login(email, password))
  } catch (e) {
    console.warn(`Could not log in ${role}: ${e.message}`)
    return null
  }
}

export function setup() {
  return {
    student: loginOptional('student'),
    instructor: loginOptional('instructor'),
    admin: loginOptional('admin'),
  }
}

function browse(paths, tag) {
  const path = paths[Math.floor(Math.random() * paths.length)]
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { accept: 'text/html', 'user-agent': `k6-mixed-${tag}` },
    tags: { page: path, segment: tag },
  })
  check(res, { [`${tag} ok`]: (r) => r.status === 200 || r.status === 401 })
  sleep(Math.random() * 2 + 1)
}

export default function (data) {
  const roll = Math.random()

  if (roll < 0.7) {
    // anonymous public
    http.cookieJar().clear(BASE_URL)
    browse(PUBLIC_PATHS, 'public')
  } else if (roll < 0.9) {
    // authenticated student
    if (data.student) applyCookies(data.student)
    browse(STUDENT_PATHS, 'student')
  } else if (roll < 0.95) {
    // instructor / admin
    if (Math.random() < 0.5 && data.instructor) {
      applyCookies(data.instructor)
      browse(INSTRUCTOR_PATHS, 'instructor')
    } else if (data.admin) {
      applyCookies(data.admin)
      browse(ADMIN_PATHS, 'admin')
    } else {
      browse(PUBLIC_PATHS, 'public')
    }
  } else {
    // light public API interaction
    const path = API_PATHS[Math.floor(Math.random() * API_PATHS.length)]
    const res = http.get(`${BASE_URL}${path}`, { tags: { segment: 'api' } })
    check(res, { 'api responded': (r) => r.status < 500 })
    sleep(1)
  }
}
