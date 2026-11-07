# Business Skills — Developer Handover

**Platform:** bs-platform.com · Iraqi bilingual (AR/EN) education + jobs + services marketplace
**Handover date:** 23 September 2026
**Snapshot commit:** `014555b` on `main`

> Read this file first. It is written for a developer who has never seen this
> codebase, and it is deliberately blunt about the parts that will bite you.

---

## 1. The one thing to know first

**The production server is the source of truth for deployment, and this
repository matches it byte-for-byte as of the handover.**

Deployment has been done by `rsync`-ing `src/` to the server and rebuilding
there — **not** by `git push`. At handover time the local `src/` and
`/opt/bs-platform/src` were verified identical by checksum (1,189 files,
`e9a7d93b516c9ebed26f96d706e9d16c`). Everything is now committed.

**Do not break that invariant.** If you change the deploy method, migrate the
server to it deliberately — do not leave the two drifting.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.9** (App Router, RSC, Server Actions) |
| Language | TypeScript 6, React 19 |
| i18n | `next-intl` 4 — `ar` (default, RTL) + `en`, messages in `src/locales/{ar,en}.json` |
| Styling | Tailwind CSS 4 + shadcn/ui-style primitives in `src/components/ui` |
| Backend | **Self-hosted Supabase** (Docker) — Postgres 17, GoTrue, PostgREST, Storage, Kong, Realtime |
| Validation | `zod` 4 |
| Tests | `vitest` 3 — 214 tests, 26 files |
| Video | R2 (Cloudflare) + HLS via `hls.js`, AES-128 keys, per-user watermark |
| Payments | **Wayl** (thewayl.com) — create-link + HMAC webhook. `WAYL_ENV=live` |
| Email | **Resend** — ⚠️ see §9, the key is empty in production |
| AI | Three external Railway microservices — see §6 |

Desktop companion app (`Wails App/`, Go + Wails + FFmpeg) is a **separate,
optional** video studio. It is not part of the web deployment.

---

## 3. Server topology

```
Contabo VPS  169.58.37.33  ·  Ubuntu 24.04 LTS  ·  6 vCPU / 11 GB RAM / 193 GB
│
├── /opt/bs-platform            Next.js app
│   ├── src/                    ← rsync target
│   ├── .env.local              ← secrets (NOT in git)
│   └── .next/                  ← build output
│
├── /opt/supabase               Supabase docker-compose stack (11 containers)
│
├── systemd: bs-platform.service   → npm start on :3000
├── nginx  : bs-platform.com       → :3000, and /supabase/ → Kong :8000
│            TLS by Certbot/Let's Encrypt (auto-renew)
└── crontab: 10 scheduled jobs, all `curl` to /api/cron/* with a Bearer secret
```

**Database:** 73 tables in `public`, ~165 MB.

### Redeploy (the exact loop used all along)

```bash
# 1. sync source (from your machine, repo root)
rsync -az --files-from=<(printf 'path/one.ts\npath/two.tsx\n') src/ \
  root@169.58.37.33:/opt/bs-platform/src/

# 2. build ON the server, detached — it takes 4-8 min and WILL outlive your SSH
ssh root@169.58.37.33 "cd /opt/bs-platform && rm -f /tmp/b.log && \
  nohup bash -c 'npm run build > /tmp/b.log 2>&1; echo EXIT=\$? >> /tmp/b.log' >/dev/null 2>&1 &"

# 3. poll for completion, then restart
ssh root@169.58.37.33 "grep -m1 '^EXIT=' /tmp/b.log"   # repeat until it prints
ssh root@169.58.37.33 "systemctl restart bs-platform"
```

Never run the build in the foreground over SSH — it gets killed and leaves a
half-built `.next`.

### Migrations

`supabase/migrations/*.sql`, numbered `001` → `111`. **All are already applied
to production.** They are applied manually:

```bash
scp supabase/migrations/112_thing.sql root@169.58.37.33:/tmp/
ssh root@169.58.37.33 "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/112_thing.sql"
```

There is no migration runner and no `supabase db push` in this setup. Write
every migration idempotently (`if not exists`, `on conflict do nothing`) —
they get re-run by hand more often than you would like.

---

## 4. ⚠️ Five traps that have each caused a "the site is broken" report

These are not hypothetical. Each one shipped a user-visible bug.

### 4.1 `public.users` has COLUMN-level grants

The `authenticated` Postgres role can read only **41 of 99 columns**. Selecting
a restricted column through the session (RLS) client makes PostgREST reject
**the entire query** with `42501 permission denied for table users`.

Because almost every call site writes `const { data } = await supabase…` and
ignores `error`, that failure surfaces as an **empty result**, not an error.
This hid real job applications from employers for weeks, and made
`/api/portfolio/settings` return 404 for every user.

- The blocked list lives in `src/lib/supabase/restricted-user-columns.ts`
  (with the SQL to regenerate it).
- `src/lib/supabase/__tests__/restricted-user-columns.test.ts` **fails the
  build** if a new session-client select names one.
- **Rule:** read those columns with `createAdminClient()`, scoped to the
  caller's own row, after checking authorisation explicitly.

### 4.2 Users-table self-writes must use the admin client

`authenticated` has **no UPDATE grant** on `public.users` at all. A user
updating their own profile through the RLS client always fails. Every
self-write goes through `createAdminClient()` scoped by `.eq('id', userId)`.

### 4.3 `'use server'` files may only export async functions

A `'use server'` module that exports a const array or object breaks the build
with a confusing error. Put constants in a sibling `*-constants.ts`.

### 4.4 Caching hides your change

- Listing pages use `export const revalidate = 120` plus `unstable_cache`.
- After changing data **by direct SQL**, the page can lag up to 2 minutes.
- Server actions call `revalidatePath` / `revalidateTag` — direct SQL does not.
- **When verifying, query PostgREST or the API route directly**, not the page.

### 4.5 Verifying by grepping rendered HTML gives false positives

`next-intl` embeds the **entire** message bundle in every page, so any
translated string appears in the HTML of pages that do not render it. Also,
the RSC payload escapes quotes — grep `\"abc\"`, not `"abc"`.

Verify with: the API route, PostgREST, or a real browser DOM check.

---

## 5. Where things live

```
src/
├── app/[locale]/           pages (public, (student), (instructor), admin)
├── app/api/                route handlers — chat, cron, payments, recommendations
├── components/             admin/ company/ courses/ jobs/ chat/ tracking/ ui/ …
├── lib/
│   ├── supabase/           admin (service role) | server (RLS) | public (anon)
│   ├── subscription/       entitlements.ts  ← company plan gates, AI metering
│   ├── hr-chat/            job-scoped HR chatbot: filters + dataset loader
│   ├── job-alerts/         ≥80% match sweep: matching, telegram, dispatch
│   ├── chat/               platform chatbot: providers, history, role briefs
│   ├── jobs/ courses/ payment/ recommendations/ articles/ companies/ tracking/
│   └── admin/              admin server actions + platform-settings
├── locales/{ar,en}.json    ~4,325 keys each — MUST stay in sync
└── types/
supabase/migrations/        001 → 111
workers/video-processor/    FFmpeg HLS transcoding worker
docs/                       ARCHITECTURE_SUMMARY, DEVELOPMENT_RULES, ai-services, …
```

### Three Supabase clients — pick deliberately

| Client | Role | Use for |
|---|---|---|
| `createAdminClient()` | service_role | Anything touching restricted columns, cross-user reads, all writes to `users`. **Bypasses RLS — you must authorise manually.** |
| `createClient()` (server) | authenticated | Normal user-scoped reads where RLS is the correct boundary |
| `createPublicClient()` | anon | Cookieless public reads, safe inside `unstable_cache` |

---

## 6. External services

| Service | Env var | Status |
|---|---|---|
| **TrainerStudio** (course + quiz generation) | `TRAINER_STUDIO_API_URL` | ✅ working, funded |
| **learning_assistant** (chat, course/job recommendations) | `LEARNING_ASSISTANT_API_URL` | ✅ working |
| **CV Builder** (CV PDF, AI CV editing) | `CV_BUILDER_API_URL` | ❌ **broken** — see §9 |
| **Wayl** (payments) | `WAYL_*` | ✅ live |
| **Cloudflare R2** (video) | `R2_*` | ✅ live |
| **Resend** (email) | `RESEND_API_KEY` | ❌ **empty** — see §9 |
| **Anthropic** (preferred chatbot provider) | `ANTHROPIC_API_KEY` | ⬜ empty by design — the code falls back to learning_assistant |

**Important:** the platform chatbot was originally written against the
Anthropic API. Production has never had that key, so every chat turn falls
through to `lib/chat/assistant-fallback.ts` → learning_assistant. If you add
an Anthropic key, Anthropic becomes the primary provider automatically.

---

## 7. Environment variables

`.env.local` on the server. **Never in git.** `.env.example` lists the names.

```
NEXT_PUBLIC_SUPABASE_URL         https://bs-platform.com/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY    (secret)
SUPABASE_SERVICE_ROLE_KEY        (secret — full DB access, treat as root)
NEXT_PUBLIC_APP_URL              https://bs-platform.com
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH   true
NEXT_PUBLIC_ALLOW_HTTP_SUPABASE  (dev only)

CRON_SECRET                      Bearer token every /api/cron/* checks
VIDEO_KEY_MASTER_SECRET          derives per-lesson AES-128 video keys — ROTATING IT BREAKS EXISTING VIDEO

R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT
R2_BUCKET_NAME                   bs-platform-videos

WAYL_API_URL / WAYL_SECRET_TOKEN / WAYL_WEBHOOK_SECRET
WAYL_ENV                         live
PAYMENT_DEV_MODE                 (empty = real payments)

RESEND_API_KEY / RESEND_FROM_EMAIL     ⚠️ both empty
TRAINER_STUDIO_API_URL / CV_BUILDER_API_URL / LEARNING_ASSISTANT_API_URL
ANTHROPIC_API_KEY                (empty)
TELEGRAM_WEBHOOK_SECRET          (empty — Telegram alerts not yet enabled)
```

**Values are delivered separately and securely — they are not in this archive.**
Rotate anything that has been shared over chat before handing it on.

---

## 8. Scheduled jobs (server crontab)

| When | Endpoint | Purpose |
|---|---|---|
| every 30 min | `expire-stale-payments` | close abandoned checkouts |
| hourly | `fetch-external-jobs` | Iraqi Job Pool API → `imported_jobs` → live jobs |
| `:15` hourly | `job-alerts` | ≥80% match alerts (in-app / Telegram / email) |
| 02:00 | `backfill-certificates` | |
| 03:00 | `cleanup-notifications` | |
| 04:30 | `expire-jobs` | 30-day job lifetime |
| 05:00 | `video-leak-scan` | |
| 06:00 | `jobs/cron-fetch` | secondary job source |
| 07:00 | `video-provider-health` | |
| 1st of month 08:00 | `monthly-job-status` | |

All authenticate with `Authorization: Bearer $CRON_SECRET`.

---

## 9. 🔴 Known gaps — start here

### 9.1 Email is completely disabled in production

`RESEND_API_KEY` is **empty**. `sendEmail()` returns
`{ success: false, error: 'not_configured' }` and logs a warning — it never
throws, so **nothing looks broken**. Six features silently send nothing:

- welcome email on signup (`app/api/auth/welcome`)
- lead notifications to management (`lib/landing/lead-notify`)
- ≥80% job alerts by email (`lib/job-alerts/dispatch`)
- service order notifications (`lib/services/send-order-notifications`)
- `lib/notify.ts` and `lib/email.ts` generally

**Fix:** create a Resend account, verify `bs-platform.com`, set
`RESEND_API_KEY` and `RESEND_FROM_EMAIL`, restart. No code change needed.

### 9.2 CV Builder service is failing

`cvbuilder-production-91d2.up.railway.app` returns
`OpenRouter 402 — You requested up to 65535 tokens, but can only afford …`.
Its configured `max_tokens` exceeds the OpenRouter balance.

Blocks: CV PDF export, AI CV editing. The platform degrades cleanly (clear
error + retry) but the feature is dead.

**Fix (owner's Railway account):** lower `max_tokens` to ~8000, or add credit.
The platform does **not** send `max_tokens` — it is set inside that service.

### 9.3 Telegram job alerts not enabled

Code is complete (`lib/job-alerts/telegram.ts`, `/api/telegram/webhook`).
Needs `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`
from @BotFather, then register the webhook at
`https://bs-platform.com/api/telegram/webhook`. In-app alerts already work;
Telegram deliveries currently log `skipped_unlinked`.

### 9.4 Page weight — the biggest remaining optimisation

Every page ships the **entire** next-intl message bundle: ~240 KB of each
page's 310 KB HTML (4,325 keys). Current performance is acceptable
(≈1.5 s on 4G, under the 3 s target) so this was left alone, but per-page
message scoping is the single biggest win available. Risky: a missed
namespace renders raw keys to users.

### 9.5 Content is empty

After the 2026-09-02 pre-launch wipe: **0 courses**, 0 articles. ~4,700 active
jobs (imported). 52 users. The catalogue must be filled before launch.

### 9.6 Orphaned storage files

16 files (deleted courses' thumbnails/documents) remain in Supabase Storage.
`storage.objects` has a `protect_delete()` trigger blocking direct SQL deletes
— use the Storage API. Harmless, unreferenced.

---

## 10. Working practices that kept this codebase sane

1. **Verify on the live server, not in your head.** Every claim in the change
   reports was checked with a real request against production.
2. **`const { data } = await …` without reading `error` is how bugs hide here.**
   Three separate user-visible failures came from exactly that.
3. **Extract decisions into pure functions.** Server actions cannot be curl'd;
   `resolveJobSaveTransition`, `computePeriodEnd`, `scoreMatch`,
   `sanitizeHistory` are all pure and unit-tested for that reason.
4. **`grep -c` counts LINES, not occurrences.** Use `grep -o … | wc -l`.
5. **Clean up test data.** Throwaway accounts and rows were always deleted
   after verification — the production database is not a scratchpad.
6. **Keep `ar.json` and `en.json` in sync.** Editing them with
   `json.dump(indent=2)` reformats the whole file; verify with a leaf-key diff
   (expect only the keys you meant to change) before deploying.

### Commands

```bash
npm run dev         # local dev (needs a local Supabase — see docs/)
npm run build       # production build
npm run typecheck   # tsc --noEmit — run before every deploy
npm test            # vitest, 214 tests
npm run lint
```

---

## 11. Feature map (what exists)

**Learning:** courses, sections/lessons, HLS video with DRM-lite protection,
quizzes, final exams, certificates with public verification, progress
tracking, instructor studio + AI course/quiz generation (TrainerStudio).

**Jobs:** platform-posted + imported (Telegram/API) listings kept visually and
functionally separate, applications, employer applicant views, AI candidate
matching, ≥80% match alerts, featured jobs (Enterprise plan).

**Companies:** full org profile, public company pages (`/companies/[slug]`),
three-tier plans with server-enforced entitlements and monthly AI usage caps,
job-scoped HR chatbot, company academy seat purchasing.

**Services marketplace:** freelancer listings, orders, portfolios with
uploadable HTML templates.

**Community:** member directory gated on profile completeness, AI search.

**Platform:** bilingual everything, single-session enforcement for students
(admins exempt), admin dashboard (users, courses, jobs, payments, plans,
articles, homepage banner, marketing), growth-guide lead magnet, articles,
floating AI assistant with per-role context, marketing tracking stack.

---

## 12. History

Nine rounds of client change requests, `BS-01` → `BS-111`, all shipped. The
`docs/` folder and the per-round notes in the repo carry the detail. The three
most instructive fixes:

- **BS-100** — job applications invisible to employers. Not RLS, not
  ownership: a column-level GRANT (§4.1).
- **BS-99** — plan switching minted free subscription months. Fixed by making
  entitlement resolution single-source and refusing free grants while a paid
  entitlement is live.
- **Chatbot "still broken"** — worked in every server test, failed for one
  person: their sessionStorage transcript held a malformed entry that failed
  validation on every subsequent turn. Client-persisted state replayed into a
  request is now sanitised on both load and send.

---

## 13. First week checklist

1. Get `.env.local` (delivered separately) and SSH access; **rotate every
   credential that has ever been shared over chat**.
2. `npm ci && npm run typecheck && npm test` locally — expect 214 passing.
3. Read `docs/DEVELOPMENT_RULES.md` and `docs/ARCHITECTURE_SUMMARY.md`.
4. Read §4 of this file again. Those five traps cost weeks.
5. Do one trivial deploy end-to-end (change a string, rsync, build, restart)
   to prove the loop works for you.
6. Fix §9.1 (email) — it is the highest-value, lowest-risk item open.
