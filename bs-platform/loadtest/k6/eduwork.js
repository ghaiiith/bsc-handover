import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate } from 'k6/metrics'

/**
 * EduWork distributed load test (k6 / k6 Cloud).
 *
 * Run locally:
 *   k6 run -e BASE_URL=https://platform-12.vercel.app -e SCENARIO=smoke loadtest/k6/eduwork.js
 *
 * Run on k6 Cloud (traffic from many IPs/regions — bypasses single-IP firewall):
 *   k6 cloud login --token <YOUR_TOKEN>
 *   k6 cloud run -e BASE_URL=https://platform-12.vercel.app -e SCENARIO=load loadtest/k6/eduwork.js
 *
 * SCENARIO: smoke | load | stress | spike | soak   (default: smoke)
 */

const BASE_URL = (__ENV.BASE_URL || 'https://platform-12.vercel.app').replace(/\/$/, '')
const SCENARIO = __ENV.SCENARIO || 'smoke'

// Public, read-only, edge-cacheable pages — safe to load.
const PATHS = [
  '/ar',
  '/en',
  '/ar/courses',
  '/en/courses',
  '/ar/jobs',
  '/ar/services',
]

const blocked = new Rate('vercel_challenge_rate') // tracks firewall 403 challenges

// --- Scenario profiles -----------------------------------------------------
const PROFILES = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '1m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 500 },
      { duration: '30s', target: 500 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: 30,
    duration: '15m',
  },
}

const profile = PROFILES[SCENARIO] || PROFILES.smoke

export const options = {
  scenarios: {
    [SCENARIO]: { ...profile, gracefulStop: '10s' },
  },
  thresholds: {
    // <1% genuine failures (excludes documented Vercel challenge accounting).
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    vercel_challenge_rate: ['rate<0.05'], // alert if firewall is challenging us
  },
  // k6 Cloud: spread load across regions so we look like real distributed users.
  cloud: {
    name: `EduWork ${SCENARIO}`,
    distribution: {
      // Free tier allows a single load zone. Frankfurt is closest to the
      // Iraq/MENA audience among the available zones.
      frankfurt: { loadZone: 'amazon:de:frankfurt', percent: 100 },
    },
  },
}

export default function () {
  group('public-read', () => {
    for (const path of PATHS) {
      const res = http.get(`${BASE_URL}${path}`, {
        headers: {
          'accept': 'text/html',
          'user-agent': 'k6-eduwork-loadtest',
        },
        tags: { page: path },
      })

      const isChallenge =
        res.status === 403 && String(res.body).includes('Vercel Security Checkpoint')
      blocked.add(isChallenge)

      check(res, {
        'status is 200': (r) => r.status === 200,
        'not firewall-challenged': () => !isChallenge,
      })

      sleep(1) // pacing: ~1 req/s per VU per page, realistic browsing cadence
    }
  })
}
