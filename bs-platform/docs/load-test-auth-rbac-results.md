# Auth RBAC Load Test Results

> Fill this in after each run. The headline question this report must answer:
> **Did authenticated navigation stop querying `public.users` through the proxy
> in the normal path?** (i.e. `claims_used` dominates, `db_fallback_used` ~ 0.)

## Run metadata

| Field | Value |
|-------|-------|
| Date | _YYYY-MM-DD_ |
| Environment | _preview / staging / production_ |
| Commit hash | _`git rev-parse --short HEAD`_ |
| Deployed URL | _https://..._ |
| k6 version | _`k6 version`_ |
| Backfill run before test? | _yes/no — `npm run auth:claims:backfill`_ |

## Scripts & stages

| Script | Stage | VUs | Duration |
|--------|-------|-----|----------|
| `loadtest/k6/public-browsing.js` | _smoke_ | _5_ | _1m_ |
| `loadtest/k6/authenticated-navigation.js` (ROLE=student) | _low_ | _25_ | _3m_ |
| `loadtest/k6/authenticated-navigation.js` (ROLE=instructor) | | | |
| `loadtest/k6/authenticated-navigation.js` (ROLE=admin) | | | |
| `loadtest/k6/mixed-platform.js` | | | |

## HTTP metrics (from k6 summary)

| Metric | Public | Student | Instructor | Admin | Mixed |
|--------|--------|---------|------------|-------|-------|
| Total requests | | | | | |
| Failed (%) | | | | | |
| req/s | | | | | |
| p50 (ms) | | | | | |
| p95 (ms) | | | | | |
| p99 (ms) | | | | | |
| Status distribution | | | | | |

## Proxy auth metrics (from app logs)

Count occurrences of each `[proxy/auth]` event during the run window
(e.g. `grep '"event":"claims_used"' | wc -l`, or query your log aggregator).

| Event | Count | Expected after backfill |
|-------|-------|-------------------------|
| `claims_used` | | **high** (dominant) |
| `claims_missing` | | ~0 |
| `db_fallback_used` | | **~0** |
| `db_fallback_failed` | | **0** |
| `claims_sync_scheduled` | | ~0 (only for stragglers) |
| `role_denied` | | only in negative tests |
| `inactive_user_redirected` | | only for inactive account |

## Thresholds pass/fail

- [ ] `http_req_failed` < 1% (all scripts)
- [ ] Authenticated p95 < 800ms, p99 < 1500ms
- [ ] Public p95 < 300–500ms (cached)
- [ ] Mixed p95 < 1000ms
- [ ] `db_fallback_used` near zero after backfill
- [ ] No raw JWT / cookie / service-role key in logs

## Log snippets / screenshots

_Paste representative `[proxy/auth]` log lines and the k6 end-of-test summary._

## Interpretation

_Did claims_used dominate? Was there any repeated db_fallback_used? Where did
latency concentrate (auth pages vs data queries vs video)?_

## Bottlenecks found

_e.g. Supabase PostgREST saturation, cold starts, a specific slow route._

## Next actions

_Follow-ups, threshold adjustments, re-run plan._
