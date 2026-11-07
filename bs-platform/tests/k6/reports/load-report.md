# k6 Load Test Report

**Target:** `https://platform-12.vercel.app`
**Script:** `tests/k6/load.js`
**Profile:** ramp 0→20 VUs (30s), hold 20 VUs (2m), ramp down (30s). Each VU browses a random page with 1–3s think time.
**Goal:** Measure behavior under expected/normal sustained concurrency.

## Results

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Total requests | 1031 | — | — |
| Request rate | 5.70 req/s | — | — |
| Max VUs | 20 | — | — |
| **HTTP failures** | **0.00% (0)** | `<1%` | **PASS** |
| **Checks passed** | **100% (2062/2062)** | `>98%` | **PASS** |
| Latency avg | 908 ms | — | — |
| Latency med | 787 ms | — | — |
| Latency p90 | 1166 ms | — | — |
| **Latency p95** | **1539 ms** | `<2500ms` | **PASS** |
| Latency max | 7242 ms | — | — |

### Per-page p95
| Page | p95 | avg |
|---|---|---|
| home | 1102 ms | 538 ms |
| jobs | 1158 ms | 870 ms |
| community | 1248 ms | 816 ms |
| services | 1492 ms | 1012 ms |
| courses_search | 1833 ms | 933 ms |
| courses | 2132 ms | 1263 ms |

## Verdict
**PASS.** All thresholds met. The site comfortably serves ~20 concurrent users.

## Observations
- **Warm performance is markedly better than smoke** (p95 1.54s vs 2.67s). Once Vercel instances are warm, median response drops to ~0.8s.
- **One 7.2s outlier** (max) corresponds to a cold start during the ramp-up phase — expected, not a sustained problem.
- `courses` and `courses_search` remain the heaviest pages, pointing to the course-listing query as the most expensive read path.

## Recommendation
- Normal-traffic performance is healthy. To shave the listing-page tail latency, pursue the deferred perf items: DB-side pagination, response caching, and the `031` indexes.
