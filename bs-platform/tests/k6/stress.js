// Stress test: pushes well beyond normal load to find the breaking point.
// Peak is capped at 100 VUs to limit cost/impact against the live deployment.
import { sleep } from 'k6'
import { hit, randomEndpoint } from './config.js'
import { buildSummary } from './summary.js'

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 80 },
        { duration: '1m', target: 100 }, // peak stress
        { duration: '1m', target: 100 }, // sustain peak
        { duration: '30s', target: 0 }, // recovery
      ],
      gracefulRampDown: '10s',
    },
  },
  // Loose thresholds: we want to observe degradation, not abort early.
  thresholds: {
    http_req_failed: ['rate<0.10'], // tolerate up to 10% before flagging
  },
}

export default function () {
  hit(randomEndpoint())
  sleep(Math.random() * 1 + 0.5) // shorter think time = more pressure
}

export function handleSummary(data) {
  return buildSummary('stress', data)
}
