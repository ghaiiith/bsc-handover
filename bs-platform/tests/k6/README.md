# k6 Performance Test Suite

Load tests for the EduWork platform. All tests hit **public GET pages only** —
no AI (Claude), payment, auth, or mutating endpoints — to avoid cost/side effects.

## Layout
- `config.js` — base URL, locale, endpoint list, request helper + per-page trends
- `summary.js` — dependency-free summary writer (`results/<stage>-summary.{txt,json}`)
- `smoke.js` — 1 VU, 40s — functional health check
- `load.js` — up to 20 VUs, 3m — normal traffic
- `stress.js` — up to 100 VUs, 5m — find the breaking point
- `results/` — raw JSON + text summaries (generated)
- `reports/` — written analysis per stage

## Run
```bash
# default target is https://platform-12.vercel.app
k6 run tests/k6/smoke.js
k6 run tests/k6/load.js
k6 run tests/k6/stress.js

# override target / locale
k6 run -e BASE_URL=http://localhost:3000 -e LOCALE=en tests/k6/load.js
```

## Combined results (target: platform-12.vercel.app)

| Stage | Max VUs | Req/s | Failures | p95 latency | Verdict |
|---|---|---|---|---|---|
| Smoke | 1 | 0.36 | 0% | 2674 ms | PASS (functional) |
| Load | 20 | 5.70 | 0% | 1539 ms | PASS |
| Stress | 100 | 6.28 | 2.03% | 42360 ms | Saturated |

## Headline finding
Throughput plateaus at **~6 req/s** from 20 VUs onward. Higher concurrency adds
no throughput, only latency — a **backend concurrency bottleneck** (most likely
Supabase connections + uncached per-request SSR queries). See
`reports/stress-report.md` for root-cause analysis and the prioritized fix list.
