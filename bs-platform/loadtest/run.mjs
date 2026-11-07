#!/usr/bin/env node
/**
 * EduWork durability test harness.
 *
 * Orchestrates autocannon (fetched on-demand via npx — no deps added to the
 * project) across a set of endpoints for a chosen scenario, then prints an
 * aggregated latency / throughput / error report.
 *
 * Usage:
 *   node loadtest/run.mjs <baseUrl> <scenario> [--full]
 *
 *   <baseUrl>   e.g. https://your-app.vercel.app   (no trailing slash)
 *   <scenario>  smoke | load | stress | spike | soak   (default: smoke)
 *   --full      also exercise API endpoints (writes/AI cost) — OFF by default
 *
 * Examples:
 *   node loadtest/run.mjs https://eduwork.vercel.app smoke
 *   node loadtest/run.mjs https://eduwork.vercel.app stress
 */

import { spawn } from 'node:child_process'

const [, , baseUrlArg, scenarioArg = 'smoke', ...rest] = process.argv
const FULL = rest.includes('--full')

if (!baseUrlArg) {
  console.error('ERROR: provide a base URL, e.g.\n  node loadtest/run.mjs https://your-app.vercel.app smoke')
  process.exit(1)
}

const BASE = baseUrlArg.replace(/\/$/, '')

// --- Scenario profiles -----------------------------------------------------
// connections = concurrent virtual users; duration in seconds.
const SCENARIOS = {
  smoke: { connections: 5, duration: 20 },   // baseline sanity
  load: { connections: 30, duration: 60 },   // expected peak
  stress: { connections: 100, duration: 60 }, // beyond capacity
  spike: { connections: 200, duration: 30 },  // sudden surge
  soak: { connections: 20, duration: 600 },   // endurance / leak hunt
}

const profile = SCENARIOS[scenarioArg]
if (!profile) {
  console.error(`Unknown scenario "${scenarioArg}". Choose: ${Object.keys(SCENARIOS).join(', ')}`)
  process.exit(1)
}

// --- Endpoints -------------------------------------------------------------
// Public, read-only, cache/ISR-backed pages. Safe to load without polluting
// data. Both locales to exercise the i18n middleware path.
const READ_PATHS = [
  '/ar',
  '/en',
  '/ar/courses',
  '/en/courses',
  '/ar/jobs',
  '/ar/services',
]

// Opt-in only: exercises rate limiting & validation without valid payloads.
// These should mostly return 400/401/429 quickly — we measure that the app
// rejects cheaply rather than melting down.
const API_PATHS = [
  '/api/chat/general', // POST, will 400 on empty body — tests cheap rejection
]

const targets = [
  ...READ_PATHS.map((p) => ({ path: p, method: 'GET' })),
  ...(FULL ? API_PATHS.map((p) => ({ path: p, method: 'POST' })) : []),
]

// --- Runner ----------------------------------------------------------------
function runAutocannon({ path, method }) {
  const url = `${BASE}${path}`
  const args = [
    '--yes',
    'autocannon',
    '-c', String(profile.connections),
    '-d', String(profile.duration),
    '-m', method,
    '--json',
  ]
  if (method === 'POST') {
    args.push('-H', 'content-type=application/json', '-b', '{}')
  }
  args.push(url)

  return new Promise((resolve) => {
    const child = spawn('npx', args, { shell: process.platform === 'win32' })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('close', () => {
      try {
        resolve({ path, method, result: JSON.parse(out) })
      } catch {
        resolve({ path, method, error: err.trim() || 'failed to parse autocannon output' })
      }
    })
  })
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('en-US') : String(n)
}

async function main() {
  console.log(`\n=== EduWork durability test ===`)
  console.log(`Target   : ${BASE}`)
  console.log(`Scenario : ${scenarioArg}  (c=${profile.connections}, d=${profile.duration}s)`)
  console.log(`Mode     : ${FULL ? 'full (incl. API)' : 'read-only public pages'}`)
  console.log(`Endpoints: ${targets.length}\n`)

  const rows = []
  for (const t of targets) {
    process.stdout.write(`-> ${t.method} ${t.path} ... `)
    const r = await runAutocannon(t)
    if (r.error) {
      console.log('ERROR')
      rows.push({ ep: `${t.method} ${t.path}`, error: r.error })
      continue
    }
    const res = r.result
    const non2xx = res.non2xx ?? 0
    const errors = (res.errors ?? 0) + (res.timeouts ?? 0)
    console.log(
      `RPS ${fmt(Math.round(res.requests.average))}  p97.5 ${fmt(res.latency.p97_5)}ms  non2xx ${non2xx}  err ${errors}`
    )
    rows.push({
      ep: `${t.method} ${t.path}`,
      rps: Math.round(res.requests.average),
      p50: res.latency.p50,
      p90: res.latency.p90,
      'p97.5': res.latency.p97_5,
      p99: res.latency.p99,
      max: res.latency.max,
      non2xx,
      errors,
    })
  }

  console.log(`\n--- Summary -----------------------------------------------`)
  console.table(rows)

  const totalErr = rows.reduce((a, r) => a + (r.errors || 0) + (r.non2xx || 0), 0)
  console.log(
    totalErr === 0
      ? '\nNo errors / non-2xx responses observed.'
      : `\nObserved ${totalErr} non-2xx/error responses — investigate above.`
  )
}

main()
