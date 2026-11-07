// Load test: simulates expected/normal concurrent traffic over a sustained period.
import { sleep } from 'k6'
import { hit, randomEndpoint } from './config.js'
import { buildSummary } from './summary.js'

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // ramp up to 20 concurrent users
        { duration: '2m', target: 20 }, // hold steady
        { duration: '30s', target: 0 }, // ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500'],
    checks: ['rate>0.98'],
  },
}

export default function () {
  // Each user browses a random page, like real navigation.
  hit(randomEndpoint())
  sleep(Math.random() * 2 + 1) // think time 1-3s
}

export function handleSummary(data) {
  return buildSummary('load', data)
}
