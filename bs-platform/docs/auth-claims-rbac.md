# JWT RBAC claims (proxy / middleware)

## Why `app_metadata`?

The BS Platform proxy gates page navigations by role and account status. Before this change, authenticated navigations often called `public.users` after `getClaims()` because `role` and `is_active` were not present in the JWT.

That added **1–2 Supabase round trips per navigation** — a scalability bottleneck under many logged-in users.

Authorization fields now live in **Supabase Auth `app_metadata`** (server-controlled):

| Field | Purpose |
|-------|---------|
| `role` | `student` \| `instructor` \| `admin` \| `company` |
| `is_active` | Account enabled / suspended |
| `profile_status` | `active` \| `suspended` (derived) |
| `claims_version` | Bumps when role/active changes |
| `claims_updated_at` | ISO timestamp of last sync |

### What we do **not** use

- **`user_metadata`** — user-editable; never used for authorization
- **Client-side role checks alone** — RLS remains the data-layer authority
- **JWT as source of truth** — `public.users` is canonical; JWT is a cached projection

## Where claims are synced

Server-only helper: `src/lib/auth/sync-user-claims.ts`

Synced automatically after:

- New user profile creation (`ensureUserProfile`)
- Registration / OAuth callback
- Login profile sync (`syncUserProfile` → `syncAndRefreshAuthClaims`)
- Admin role change (`changeUserRole`)
- Admin suspend/reactivate (`setUserActive`)
- Instructor request approval
- Company affiliation approval

On proxy DB fallback (missing claims), a background `syncUserAuthClaims` is scheduled.

## Proxy decision flow

```
i18n middleware
→ (public + no auth cookie) fast path
→ getClaims()
→ parse app_metadata.role + app_metadata.is_active
→ if complete: allow / redirect (no users table query)
→ if incomplete: one DB fallback + schedule claims backfill
→ fail-safe: privileged routes deny when role cannot be proven
```

Metrics are logged as `[proxy/auth] {"event":"claims_used",...}`.

## Backfill existing users

One-time script for users created before claims were introduced:

```bash
npm run auth:claims:dry-run
npm run auth:claims:backfill
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Optional env:

- `CLAIMS_BACKFILL_BATCH` (default `50`)
- `CLAIMS_BACKFILL_DELAY_MS` (default `200`)

## After changing a user role

1. DB update in `public.users` (canonical)
2. `syncUserAuthClaims(userId)` updates `auth.users.app_metadata`
3. **Affected user must refresh session** to pick up new JWT claims:
   - Re-login, or
   - `refreshAuthSession()` on the client (`src/lib/auth/refresh-session.ts`), or
   - `syncAndRefreshAuthClaims()` server action after login/profile sync

Until refresh, the browser may still hold the old JWT. `app_metadata` is updated immediately server-side; the access token updates on next refresh.

### Promotion example (student → instructor)

Admin approves instructor request → claims synced → user should refresh session (or log in again) before `/instructor` routes recognize the new role in the JWT.

## Verify proxy no longer queries users normally

1. Run backfill for all users.
2. Log in as a student with complete claims.
3. Navigate `/dashboard`, `/learn`, etc.
4. Dev server logs should show `[proxy/auth] {"event":"claims_used",...}` and **not** `db_fallback_used` on every navigation.

## Proxy metrics (`[proxy/auth]`)

Emitted by `logProxyAuthMetric` (`src/lib/auth/proxy-rbac-metrics.ts`). Logs
contain only `event`, `path`, `reason`, `role` — never JWTs, cookies or secrets.

| Event | Meaning | Expected after backfill |
|-------|---------|-------------------------|
| `claims_used` | Role/active read straight from JWT | **high (dominant)** |
| `claims_missing` | JWT present but claims incomplete | ~0 |
| `db_fallback_used` | Had to query `public.users` | **~0** |
| `claims_sync_scheduled` | Background claim sync queued after a fallback | ~0 (stragglers only) |
| `db_fallback_failed` | Fallback query returned nothing | **0** |
| `role_denied` | Wrong role for a privileged route | negative tests only |
| `inactive_user_redirected` | `is_active=false` → `/account-suspended` | suspended accounts only |
| `unauthenticated_protected` | No session on a protected route → `/login` | anonymous hits |

## Role / route policy

| Role | `/dashboard` | `/learn` | `/instructor` | `/admin` |
|------|-----------|----------|---------------|----------|
| `student` | allow | allow | deny | deny |
| `instructor` | allow | allow | allow | deny |
| `admin` | allow | allow | allow | allow |
| `company` | allow (platform policy) | allow | deny | deny |
| inactive (any) | → `/account-suspended` | → `/account-suspended` | → `/account-suspended` | → `/account-suspended` |

`company` currently has no dedicated privileged prefix; company features live
under `/dashboard/*`. If a `company`-only prefix is added later, extend
`decideProxyAuth` in `src/lib/auth/proxy-rbac.ts`.

## Fail-safe behavior

- Privileged routes (`/admin`, `/instructor`) **fail closed** when role cannot be proven.
- `getClaims()` timeout (3s) → treated as anonymous; protected routes redirect to login.
- Missing claims + failed DB fallback → protected routes redirect to login.
- Inactive users are redirected to `/account-suspended` (blocked from all gated content).
- Never fail open for `/admin` or `/instructor`.

## Load testing (authenticated)

**Before:** authenticated navigation → `getClaims()` + `users` select.
**After (normal path):** authenticated navigation → `getClaims()` only.

k6 scripts (`loadtest/k6/`, requires k6 ≥ 0.47):

- `public-browsing.js` — anonymous, confirms the proxy fast-path (no auth calls).
- `authenticated-navigation.js` — per-role (`-e ROLE=student|instructor|admin`),
  logs in once in `setup()` and reuses the session cookie.
- `mixed-platform.js` — 70% public / 20% student / 5% instructor+admin / 5% API.

```bash
k6 run -e BASE_URL=https://<app> -e SUPABASE_URL=https://<ref>.supabase.co \
  -e SUPABASE_ANON_KEY=<anon> -e ROLE=student \
  -e STUDENT_EMAIL=... -e STUDENT_PASSWORD=... \
  -e STAGE=smoke loadtest/k6/authenticated-navigation.js
```

Record results in `docs/load-test-auth-rbac-results.md`.

### Before running a load test

1. Run `npm run auth:claims:backfill` so every user has claims.
2. Redeploy / restart the server.
3. Manually log in as each role; confirm `claims_used` logs and no repeated `db_fallback_used`.
4. Confirm role denial (student → `/admin` redirects) and inactive block (`/account-suspended`).
5. Confirm no service-role key and no raw JWT/cookie appear in logs.
6. Confirm anonymous public pages still fast-path.
7. Never point auth tests at live payment gateways; prefer a staging/preview URL.

## Security notes

- RLS policies are unchanged; the JWT is a cached projection, `public.users` is canonical.
- `user_metadata` is never used for authorization.
- Only service-role code (`src/lib/auth/sync-user-claims.ts`) updates `app_metadata`.
- Load-test credentials come from env vars only — never commit passwords.
