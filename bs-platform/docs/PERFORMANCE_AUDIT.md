# Performance Audit — EduWork Platform

**Goal:** minimize page response time while keeping the current security posture (RLS, PII lockdown, secure auth).
**Scope:** the public, high-traffic pages — home, `/courses`, `/services`, `/jobs`, `/community` — plus the shared request path (middleware + auth + data layer).

---

## 1. Evidence (from k6 load tests against `platform-12.vercel.app`)

| Stage | Max VUs | Throughput | p95 latency | Failures |
|---|---|---|---|---|
| Smoke | 1 | 0.36 req/s | 2.67 s (cold) | 0% |
| Load | 20 | 5.70 req/s | 1.54 s | 0% |
| Stress | 100 | **6.28 req/s** | **42 s** | 2% (timeouts) |

**Headline:** throughput is stuck at **~6 req/s** whether 20 or 100 users hit the site. Extra concurrency adds **no** throughput — only queuing and latency. This is the signature of a **backend round-trip + connection bottleneck**, not CPU/bandwidth. Warm single-user latency (~0.8–1.5 s) is also high for what are simple list pages.

---

## 2. Root causes (ranked by impact)

### A. The listing pages are fully **dynamic** — ISR is silently disabled  *(highest impact)*
`/courses`, `/services`, `/jobs` declare `export const revalidate = 60/120`, but they call cookie-reading code on every request:
- `@/Users/.../src/app/[locale]/courses/page.tsx:18,45` → `getSessionProfile()`
- `@/Users/.../src/lib/auth/profile.ts:148` and `@/Users/.../src/lib/supabase/server.ts:5` → `await cookies()`
- The list functions default to the **cookie-based** client (`createClient()`), e.g. `@/Users/.../src/lib/services/list-services.ts:148`, `@/Users/.../src/lib/jobs/list-jobs.ts:75`.

Reading cookies forces Next into **dynamic rendering**, so `revalidate` never takes effect. **Every request re-renders the page and re-runs every DB query.** The landing page already does this correctly for contrast — cookieless `createPublicClient()` + `unstable_cache` (`@/Users/.../src/lib/landing/get-landing-data.ts:1,45`).

### B. Two auth-server round-trips on every navigation
`supabase.auth.getUser()` calls the Supabase Auth (GoTrue) server over the network to validate the JWT. It runs **twice per page load**:
- Middleware: `@/Users/.../src/middleware.ts:66`
- Page: `@/Users/.../src/lib/auth/profile.ts:151`

Plus a `users` lookup in each place (`middleware.ts:85-89` selects `role, is_active`; `profile.ts:155-159` selects `*`). For a logged-in user that's **2 auth round-trips + 2 users queries** before the page even queries its own data.

### C. `/services` loads the **entire table** on every request  *(scales badly)*
`@/Users/.../src/lib/services/list-services.ts:150-201` selects **all** active services (+ seller join), then fetches ratings and order counts for **all** of them, enriches **all**, sorts in memory, and slices for pagination (`:229-232`). There is no `.range()` and no DB `count`. Cost grows linearly with the catalog.

### D. `count: 'exact'` forces a full scan
`@/Users/.../src/lib/courses/list-courses.ts:114` and `@/Users/.../src/lib/jobs/list-jobs.ts:82` request an exact row count, which scans all matching rows on every request just to render a pagination total.

### E. Multiple sequential round-trips per list
Each listing does main query → ratings → enrollment/order counts. In `@/Users/.../src/lib/courses/list-courses.ts:188-192` the ratings and enrollment-count calls are **sequential** `await`s (not `Promise.all`), and the counts use a separate admin client (extra connection): `@/Users/.../src/lib/courses/enrollment-count.ts:17`.

### F. Search uses un-indexed `ilike '%term%'`
e.g. `@/Users/.../src/lib/jobs/list-jobs.ts:87-89` and `list-services.ts:157-159` do `ilike` across several columns → sequential scans. Migration `031` adds trigram/GIN + composite indexes but **has not been applied** to the database.

### G. Connection saturation under load
Each request opens cookie + admin Supabase clients. With the per-request query fan-out (B–E), concurrency exhausts the connection pool → the ~6 req/s ceiling seen in the stress test.

### H. `select('*')` and likely cross-region round-trips
Wide selects (`profile.ts:157`, service/job `BASE_SELECT *`) move unneeded columns. And if the Vercel function region differs from the Supabase region, **every** round-trip in A–E pays cross-region RTT (~100–200 ms each) — which alone explains much of the 0.8–1.5 s warm latency given ~5 serial round-trips.

---

## 3. Recommended solutions (ranked by impact / effort)

### P1 — Make public listings cacheable again  *(biggest win, moderate effort)*
- Render the list HTML from a cookieless `createPublicClient()` wrapped in `unstable_cache` (mirror `get-landing-data.ts`).
- Move per-user UI (course recommendations, profile score, "enrolled" badges) into **client components** that call a small dynamic endpoint, or isolate them behind their own `Suspense` boundary so they don't taint the page.
- Result: `revalidate` works; the vast majority of requests serve cached HTML and **never touch the DB**, directly lifting the throughput ceiling.
- **Security:** the anon client is RLS-enforced; only public data is cached; per-user/PII data stays out of the cache. No regression to the H1 PII lockdown.

### P2 — Cut auth round-trips
- In middleware, verify the JWT **locally** with `supabase.auth.getClaims()` + asymmetric (JWKS) signing keys instead of `getUser()` — removes the GoTrue network call on every request while remaining cryptographically secure.
- Add a `role` claim to the JWT (`app_metadata`) so middleware's `users` role/`is_active` query disappears.
- On pages that only need "is the user logged in," reuse the claims rather than calling `getSessionProfile()` again, and select only needed columns instead of `*`.
- **Security:** signature verification is the recommended secure pattern; for sensitive mutations keep a `getUser()` check.

### P3 — DB-side pagination + denormalized aggregates
- Give `/services` a real `.range(from, to)` + `count`, like courses/jobs.
- Denormalize hot aggregates onto the row via triggers: `enrollment_count` on `courses`, `avg_rating`/`review_count` on `courses`/`services`, `order_count` on `services`. Then sorting (`most_enrolled`, `best_rated`, `most_orders`) happens in SQL and the per-list ratings/enrollment/order queries vanish — **one query per listing**.
- **Security:** counters are non-sensitive aggregates; triggers run server-side under controlled privileges.

### P4 — Apply migration `031` and cheap query wins
- Apply `031_perf_indexes.sql` (trigram + composite + GIN) to make search and `status + created_at` sorts index-backed.
- Replace `count: 'exact'` with `count: 'estimated'` (or cache the total).
- Parallelize remaining enrichment with `Promise.all`.
- Replace `select('*')` with explicit column lists.

### P5 — Infrastructure
- Ensure the Vercel function region matches the Supabase region (co-location removes cross-region RTT from every query).
- Use the Supabase **transaction pooler** (PgBouncer) for serverless and raise pool size / plan limits to lift the concurrency ceiling.

---

## 4. Prioritized action plan

| # | Action | Impact | Effort | Security risk |
|---|---|---|---|---|
| 1 | Cache public listings (anon client + `unstable_cache`); move per-user UI client-side | Very high | Medium | None (RLS-safe) |
| 2 | Apply migration `031` indexes | High | Trivial | None |
| 3 | Local JWT verification in middleware + `role` claim | High | Medium | Low (keep `getUser` for mutations) |
| 4 | DB pagination for `/services` | High | Low | None |
| 5 | Denormalized counters via triggers | High | Medium | Low |
| 6 | `count: 'estimated'`, `Promise.all`, trim `select('*')` | Medium | Low | None |
| 7 | Vercel/Supabase region co-location + pooler sizing | High | Low (config) | None |

**Expected outcome:** P1 + P2 + P7 alone should move warm p50 from ~0.8 s toward ~150–300 ms for cached pages and break the ~6 req/s plateau, because most requests stop hitting the database and the per-request round-trip count drops from ~5–7 to ~0–1.

---

## 5. Security guardrails (must hold while optimizing)
- Cache **only** anonymous, RLS-public data. Never cache authenticated responses or PII.
- Keep RLS enabled; the cookieless anon client must remain the anon role.
- JWT verification stays cryptographic (JWKS); don't downgrade to trusting unverified tokens.
- Preserve the prior security fixes: users-table PII lockdown, AI-endpoint auth + rate limits, search sanitization, CSV escaping, lesson-HTML sanitization, security headers.
