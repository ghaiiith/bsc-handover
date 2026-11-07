# k6 Smoke Test Report

**Target:** `https://platform-12.vercel.app`
**Script:** `tests/k6/smoke.js`
**Profile:** 1 VU, 40s, walks every public page once per iteration
**Goal:** Verify the system works and all endpoints are healthy under minimal load.

## Results

| Metric | Value |
|---|---|
| Total requests | 18 |
| Iterations | 3 |
| Max VUs | 1 |
| **HTTP failures** | **0.00% (0 failed)** |
| **Checks passed** | **100% (36/36)** |
| Latency avg | 1720 ms |
| Latency med | 1513 ms |
| Latency p90 | 2423 ms |
| Latency p95 | 2674 ms |
| Latency max | 3983 ms |

### Per-page p95
| Page | p95 | avg |
|---|---|---|
| services | 1369 ms | 1269 ms |
| home | 1773 ms | 1638 ms |
| jobs | 2028 ms | 1496 ms |
| courses | 2218 ms | 1635 ms |
| community | 2440 ms | 1914 ms |
| courses_search | **3798 ms** | 2370 ms |

## Verdict
**PASS (functional).** Every public page returns `200` with non-empty bodies; zero errors.

## Observations
- **Cold-start latency is high.** With a single user there are no warm instances, so each request pays Vercel cold-start + SSR + Supabase round-trips. p95 of 2.6s (and 3.8s for search) is slow for first-byte.
- **`courses_search` is the slowest path** — consistent with un-cached `ilike` search queries (now backed by the `pg_trgm` indexes in migration `031`, which still need to be applied to the database).

## Recommendation
- Treat smoke latency as the "cold" baseline. The load test (warm instances) is the fair perf picture.
- Apply migration `031` to make search index-backed.
