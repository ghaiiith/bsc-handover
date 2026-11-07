// Smoke test: minimal load to verify the system works and endpoints are healthy.
import { sleep } from 'k6'
import { ENDPOINTS, hit } from './config.js'
import { buildSummary } from './summary.js'

export const options = {
  vus: 1,
  duration: '40s',
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<3000'], // functional gate (cold-start tolerant); latency analyzed in report
    checks: ['rate>0.99'],
  },
}

export default function () {
  // Walk every endpoint once per iteration so all pages are exercised.
  for (const endpoint of ENDPOINTS) {
    hit(endpoint)
    sleep(1)
  }
}

export function handleSummary(data) {
  return buildSummary('smoke', data)
}
