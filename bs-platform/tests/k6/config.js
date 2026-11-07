// Shared config for the k6 test suite.
// Override with: k6 run -e BASE_URL=... -e LOCALE=en tests/k6/<stage>.js
import { check } from 'k6'
import http from 'k6/http'
import { Trend } from 'k6/metrics'

export const BASE_URL = (__ENV.BASE_URL || 'https://platform-12.vercel.app').replace(/\/$/, '')
export const LOCALE = __ENV.LOCALE || 'ar'

// Only safe, public, read-only pages. NO AI (Claude), payment, auth, or mutating
// endpoints are included — those would incur cost or side effects under load.
export const ENDPOINTS = [
  { name: 'home', path: `/${LOCALE}` },
  { name: 'courses', path: `/${LOCALE}/courses` },
  { name: 'services', path: `/${LOCALE}/services` },
  { name: 'jobs', path: `/${LOCALE}/jobs` },
  { name: 'community', path: `/${LOCALE}/community` },
  { name: 'courses_search', path: `/${LOCALE}/courses?q=design` },
]

// Per-endpoint latency trends so reports can break down by page.
const trends = {}
for (const e of ENDPOINTS) {
  trends[e.name] = new Trend(`page_${e.name}_duration`, true)
}

// Performs one GET against the given endpoint, records checks + per-page trend.
export function hit(endpoint) {
  const res = http.get(`${BASE_URL}${endpoint.path}`, {
    tags: { page: endpoint.name },
    headers: { 'Accept-Language': LOCALE },
  })

  trends[endpoint.name].add(res.timings.duration)

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body not empty': (r) => r.body && r.body.length > 0,
  })

  return res
}

// Picks a pseudo-random endpoint weighted evenly.
export function randomEndpoint() {
  return ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)]
}
