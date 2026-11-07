// Dependency-free summary builder (no network/jslib import needed).
// Writes a human-readable .txt and the raw .json into tests/k6/results/.

function ms(v) {
  return v === undefined || v === null ? 'n/a' : `${v.toFixed(1)}ms`
}

function pct(v) {
  return v === undefined || v === null ? 'n/a' : `${(v * 100).toFixed(2)}%`
}

function line(label, value) {
  return `  ${label.padEnd(28)} ${value}`
}

export function buildSummary(stage, data) {
  const m = data.metrics || {}
  const dur = (m.http_req_duration && m.http_req_duration.values) || {}
  const failed = (m.http_req_failed && m.http_req_failed.values) || {}
  const reqs = (m.http_reqs && m.http_reqs.values) || {}
  const iters = (m.iterations && m.iterations.values) || {}
  const checks = (m.checks && m.checks.values) || {}
  const vusMax = (m.vus_max && m.vus_max.values) || {}

  const lines = []
  lines.push(`================ k6 ${stage.toUpperCase()} SUMMARY ================`)
  lines.push(line('Total requests', reqs.count ?? 'n/a'))
  lines.push(line('Request rate', reqs.rate ? `${reqs.rate.toFixed(2)} req/s` : 'n/a'))
  lines.push(line('Iterations', iters.count ?? 'n/a'))
  lines.push(line('Max VUs', vusMax.max ?? vusMax.value ?? 'n/a'))
  // For the http_req_failed Rate metric, `passes` counts requests that FAILED.
  lines.push(line('HTTP failed', `${pct(failed.rate)} (${failed.passes ?? 0} failed reqs)`))
  lines.push(line('Checks passed', `${pct(checks.rate)} (${checks.passes ?? 0}/${(checks.passes ?? 0) + (checks.fails ?? 0)})`))
  lines.push('  --- latency (http_req_duration) ---')
  lines.push(line('avg', ms(dur.avg)))
  lines.push(line('min', ms(dur.min)))
  lines.push(line('med', ms(dur.med)))
  lines.push(line('p90', ms(dur['p(90)'])))
  lines.push(line('p95', ms(dur['p(95)'])))
  lines.push(line('max', ms(dur.max)))

  // Per-page breakdown from the page_<name>_duration trends.
  lines.push('  --- per-page p95 ---')
  for (const key of Object.keys(m).sort()) {
    if (key.startsWith('page_') && key.endsWith('_duration')) {
      const name = key.replace(/^page_/, '').replace(/_duration$/, '')
      const v = m[key].values || {}
      lines.push(line(name, `p95 ${ms(v['p(95)'])}  avg ${ms(v.avg)}`))
    }
  }

  // Threshold pass/fail.
  lines.push('  --- thresholds ---')
  let anyThreshold = false
  for (const name of Object.keys(m)) {
    const th = m[name].thresholds
    if (th) {
      for (const expr of Object.keys(th)) {
        anyThreshold = true
        lines.push(line(`${name} ${expr}`, th[expr].ok ? 'PASS' : 'FAIL'))
      }
    }
  }
  if (!anyThreshold) lines.push('  (none defined)')
  lines.push('=========================================================')

  const text = lines.join('\n') + '\n'

  return {
    stdout: text,
    [`tests/k6/results/${stage}-summary.txt`]: text,
    [`tests/k6/results/${stage}-summary.json`]: JSON.stringify(data, null, 2),
  }
}
