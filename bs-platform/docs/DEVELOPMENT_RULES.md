# Development Rules — For AI Coding Agents

Practical guardrails when modifying Business Skills (BS Platform). Cursor rule: `.cursor/rules/business-skills-platform.mdc`

---

## Before You Code

1. Read `docs/PROJECT_CONTEXT.md` and `docs/CURRENT_STATUS.md`
2. Identify affected files — do **not** scan the whole repo
3. Explain plan briefly, then make minimal safe edits
4. After edits: run `npm run typecheck` and `npm test` when possible
5. Summarize changed files and verification steps

---

## Security

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the client or `NEXT_PUBLIC_*` vars
- **Never** use `user_metadata` for authorization — it is user-editable
- **Never** grant admin/instructor access unless role is proven server-side
- RLS stays enabled; do not weaken policies casually
- Route handlers must validate auth and role before mutations
- Privileged routes fail safe when JWT claims are incomplete
- PII stays out of public caches

---

## Auth

| Rule | Detail |
|------|--------|
| Source of truth | `public.users` for role, `is_active`, profile |
| Cached projection | JWT `app_metadata` (role, is_active, profile_status, claims_version) |
| Sync after changes | Call `syncUserAuthClaims()` after role/status updates |
| Session refresh | User must refresh session after role change (`refreshAuthSession`, re-login) |
| Proxy | Claims-first in `src/proxy.ts`; DB fallback only when claims incomplete |
| Backfill | Run `npm run auth:claims:backfill` for legacy users |

---

## Video

- Use provider abstraction — do not hardcode Vimeo or R2 calls in UI
- **Vimeo** for high-traffic course delivery (CDN scale)
- **R2** for advanced/custom/backup pipelines
- Avoid Next.js byte-proxy for heavy HLS streaming
- Keep playback sessions, watermark, and encryption logic intact
- Desktop transcoding/upload belongs in `Wails App/`, not the web server
- Test playback routes when changing access control

---

## UI

- Arabic-first / RTL-first; test both `ar` and `en`
- Mobile-first for mobile pages — not desktop squeezed into mobile
- Business Skills identity: orange primary, teal supporting (`src/lib/brand/constants.ts`)
- Do not use icons-only controls without text labels on mobile
- i18n keys in `src/locales/` — no hardcoded strings
- Loading, error, and empty states required
- shadcn/ui components first; Tailwind only

---

## Database

- Migrations in `supabase/migrations/` — additive and safe by default
- No destructive schema changes without explicit approval
- Add indexes for hot query paths (search, status + created_at sorts)
- Financial snapshots are **immutable** once written
- Typed Supabase queries; always handle `error`

---

## Code Quality

- TypeScript strict — no `any`; interfaces in `src/types/`
- App Router conventions only
- `async/await` — no `.then()` chains
- Server Components for reads; Client Components only when needed
- Prefer small diffs; match existing patterns in surrounding files
- Do not reintroduce EduWork branding in user-facing copy

---

## Testing

| When | What |
|------|------|
| Always (when possible) | `npm run typecheck`, `npm test` |
| After UI/logic changes | `npm run lint` on changed files |
| Auth / payment / video changes | Add or update Vitest tests in `__tests__/` |
| Performance-sensitive | Consult `loadtest/k6/` and fill report template |

If full-repo lint has unrelated pre-existing failures, report them separately and confirm your changed files are clean.

---

## Token-Saving File Map

| Task | Read only |
|------|-----------|
| Auth | `src/lib/auth/`, `src/proxy.ts` |
| Video | `src/lib/video/`, `src/lib/video-providers/`, playback API routes, player components |
| UI | Specific page/component |
| DB | Relevant migrations + data helpers |
| Branding | `src/components/brand/`, theme, metadata, Navbar/Footer/Auth |

---

## Large Features

Create or update docs under `docs/` before sweeping changes. Link new docs from `PROJECT_CONTEXT.md` or `CURRENT_STATUS.md`.
