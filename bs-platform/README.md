# EduWork

EduWork is a bilingual (Arabic / English, RTL-aware) education and work platform for the Iraqi market. It combines an LMS (courses, lessons, certificates), a services marketplace, a jobs board (with AI-assisted scraping and candidate ranking), a CV builder, community features, and a multi-channel notification system.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19, TypeScript
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security)
- **Styling:** Tailwind CSS 4, shadcn/Radix UI, Framer Motion
- **i18n:** next-intl (`ar` default, `en`)
- **Integrations:** Anthropic Claude (chat / CV / course AI), Cloudflare R2 (course video storage + signed delivery), Firebase Cloud Messaging (web push), Resend (email), ZainCash & QiCard (payments, IQD)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the default locale (`/ar`).

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check then production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src` |
| `npm run verify` | `typecheck` + `lint` (run before pushing) |

## Database / Supabase

Migrations live in `supabase/migrations/` and are applied **in numeric order** via the Supabase SQL Editor. See `supabase/SETUP.md` for the ordered runbook and how to promote the first admin account.

After applying the schema, also enable **Realtime** on the `notifications` table (used by the in-app notification bell).

## Environment Variables

Create `.env.local`. `.env*` files are gitignored.

### Required (core)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key — RLS-enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — **server only**, bypasses RLS. Never expose to the client |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://your-domain.com`) |

### Optional (feature integrations)

| Variable(s) | Feature |
|---|---|
| `ANTHROPIC_API_KEY` | AI chat / CV analysis / course generation |
| `CV_BUILDER_API_URL` | External CV-builder/ATS service |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Course video storage (Cloudflare R2, S3-compatible) |
| `R2_ENDPOINT` (optional), `R2_PUBLIC_BASE_URL` (optional), `R2_SIGNED_URL_TTL_SECONDS` (optional), `R2_UPLOAD_URL_TTL_SECONDS` (optional) | R2 endpoint / CDN domain / signed-URL TTLs |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web push (client) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Web push (admin / sender) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email |
| `ZAINCASH_MERCHANT_ID`, `ZAINCASH_SECRET_KEY`, `ZAINCASH_API_URL` | ZainCash payments |
| `QICARD_API_KEY`, `QICARD_API_URL` | QiCard payments |
| `CRON_SECRET` | Bearer token guarding `/api/cron/*` and `/api/jobs/cron-fetch` |
| `TELEGRAM_WEBHOOK_SECRET` | Telegram job-ingestion webhook secret (fail-closed) |
| `RAPIDAPI_KEY`, `RAPIDAPI_HOST` | LinkedIn job scraping |
| `PAYMENT_DEV_MODE` | **Dev only.** Bypasses gateway verification; hard-blocked in production |

## Architecture

- `src/app/[locale]/` — locale-segmented routes, grouped by audience: `(auth)`, `(student)`, `(instructor)`, `(public)`, and `admin`.
- `src/app/api/` — route handlers grouped by domain (payments, cv, instructor, admin, push, cron, …).
- `src/lib/` — domain logic, organized by feature. Four Supabase clients with distinct roles:
  - `supabase/server.ts` — SSR cookie client (`authenticated` role, RLS-enforced).
  - `supabase/client.ts` — browser client (anon/authenticated).
  - `supabase/public.ts` — cookieless anon client for cacheable public reads.
  - `supabase/admin.ts` — service-role client (server only, bypasses RLS).
- `src/proxy.ts` — middleware: locale routing, auth gating of protected routes, role checks, maintenance mode.

## Security Model

- **Row Level Security** is enabled on all tables. Cross-user reads are limited to non-PII columns.
- **PII lockdown:** the `anon` (migration `028`) and `authenticated` (migration `044`) roles cannot `SELECT` the `email` / `phone` columns of `public.users`. A user reads their own full profile (incl. contact details) through the `get_my_profile()` `SECURITY DEFINER` RPC, scoped to `auth.uid()`. Legitimate cross-user contact (service-order buyer/seller) is served server-side via the service-role client, gated by buyer/seller checks in `src/lib/services/get-orders.ts`.
- **Role escalation** is prevented by a trigger (migration `032`); roles are promoted only via SQL / service role.
- **Rate limiting** is durable and atomic (Postgres RPC, migration `029`), shared across serverless instances.
- **Secrets:** cron endpoints require `Bearer ${CRON_SECRET}`; the Telegram webhook uses a timing-safe, fail-closed secret check.
- **Headers:** HSTS (preload), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (see `next.config.ts`).
- **XSS / injection:** instructor rich-text is sanitized via an allowlist; admin CSV export escapes formula characters.

### Payment integration security contract

The ZainCash and QiCard gateways are scaffolded but the live provider calls are marked `TODO`. The flow is **fail-closed**: when a gateway is not configured (and `PAYMENT_DEV_MODE` is off / production), payment initiation and callback verification both fail, so no enrollment/order can complete. When wiring the real provider APIs, you **must**:

1. **Never trust callback query/body params.** Always perform a server-to-server verify against the gateway using the stored `reference_id`.
2. **Validate the amount and currency** returned by the gateway against the stored `payments` row before completing.
3. **Keep completion idempotent** (already handled in `completePayment` via the `status = 'completed'` guard).
4. **Verify any signature/HMAC** the provider supplies on callbacks.
5. Leave `PAYMENT_DEV_MODE` unset in production (it is additionally hard-blocked in code).

## Deployment

Deployed on Vercel. `vercel.json` configures a daily cron (`/api/jobs/cron-fetch`). Ensure the Vercel function region matches the Supabase region to minimize round-trip latency, and configure the env vars above in the Vercel project settings.
