# k6 Stress Test Report

**Target:** `https://platform-12.vercel.app`
**Script:** `tests/k6/stress.js`
**Profile:** ramp 20→50→80→100 VUs, sustain 100 VUs, recover. ~5 min, 0.5–1.5s think time.
**Goal:** Push beyond normal load to find the breaking point and observe failure behavior.

## Results

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Total requests | 1919 | — | — |
| Request rate | 6.28 req/s | — | — |
| Max VUs | 100 | — | — |
| **HTTP failures** | **2.03% (39 timeouts)** | `<10%` | **PASS** |
| Checks passed | 98.91% (3796/3838) | — | — |
| Latency avg | 8654 ms | — | — |
| Latency med | 3349 ms | — | — |
| Latency p90 | 27485 ms | — | — |
| **Latency p95** | **42360 ms** | — | — |
| Latency max | 60063 ms (timeout) | — | — |

### Per-page p95 (at peak)
| Page | p95 |
|---|---|
| community | 37970 ms |
| jobs | 38907 ms |
| services | 39693 ms |
| courses_search | 40554 ms |
| home | 41728 ms |
| courses | 46753 ms |

## Verdict
**Breaking point identified.** The error-rate threshold technically passed (2% < 10%), but the system is **functionally saturated** well before 100 VUs — latency degraded to tens of seconds and requests began timing out at 60s.

## Key finding: throughput plateau (hard bottleneck)
- **Throughput stayed at ~6 req/s** whether running 20 VUs (load test: 5.70 req/s) or 100 VUs (stress: 6.28 req/s).
- Adding 5× the concurrency produced **no additional throughput** — only queueing and exploding latency.
- This is the classic signature of a **backend concurrency ceiling**, not a CPU/bandwidth limit on the load generator.

## Likely root causes (in priority order)
1. **Supabase connection/pooler limit.** Every SSR page opens a Supabase client and runs read queries; under high concurrency the connection pool (or free-tier limit) saturates and requests serialize.
2. **Per-request DB work that doesn't scale.** Each request re-runs uncached queries — listing queries, plus a `users.role` lookup on auth'd paths. The course-listing path (`courses` p95 46.7s) is the worst offender.
3. **Vercel function concurrency** on the current plan capping simultaneous SSR executions, compounding the queue.

## Recommendations (maps to deferred perf backlog)
1. **Apply migration `031`** (indexes incl. trigram search) — reduces per-query cost.
2. **DB-side pagination** for listing endpoints — stop fetching/sorting full tables in memory.
3. **Response/data caching** (ISR or `unstable_cache`) for public listing pages so they don't hit the DB on every request — the single highest-impact change for this plateau.
4. **JWT `role` claim** — removes the per-request `users` table lookup on authenticated paths.
5. **Denormalized counters** — avoid aggregate queries on hot reads.
6. **Scale the data tier** — raise the Supabase connection pool / plan, and consider Vercel plan concurrency limits.

## Safety notes
- Tests covered **public GET pages only**. No AI (Claude), payment, auth, or mutating endpoints were exercised, to avoid cost and side effects.
- Peak was intentionally capped at 100 VUs against the live deployment to limit Vercel/Supabase cost.
