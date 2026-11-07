import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'
import { BASE_URL } from './lib/session.js'

/**
 * A. Anonymous public browsing.
 *
 * Confirms public traffic stays cheap: no auth cookie is sent, so the proxy
 * fast-path returns before any Supabase call. Expect CDN/ISR cache to dominate
 * and NO `[proxy/auth]` logs for these requests.
 *
 *   k6 run -e BASE_URL=https://... -e STAGE=smoke loadtest/k6/public-browsing.js
 */

const STAGE = __ENV.STAGE || 'smoke'

const PATHS = [
  '/',
  '/ar',
  '/ar/courses',
  '/ar/jobs',
  '/ar/services',
  '/ar/community',
]

const challenge = new Rate('vercel_challenge_rate')

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
    http_req_duration: ['p(95)<500'],
    vercel_challenge_rate: ['rate<0.05'],
  },
}

export default function () {
  for (const path of PATHS) {
    // Explicit fresh jar semantics: send NO cookies so the proxy fast-path runs.
    const res = http.get(`${BASE_URL}${path}`, {
      headers: { accept: 'text/html', 'user-agent': 'k6-public-browsing' },
      tags: { page: path },
    })

    const isChallenge =
      res.status === 403 && String(res.body).includes('Vercel Security Checkpoint')
    challenge.add(isChallenge)

    check(res, {
      'status 200': (r) => r.status === 200,
      'not challenged': () => !isChallenge,
    })

    sleep(Math.random() * 2 + 1) // 1-3s think time
  }
}
