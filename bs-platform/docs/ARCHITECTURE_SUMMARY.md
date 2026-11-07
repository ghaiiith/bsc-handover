# Architecture Summary — Business Skills Platform

Concise technical map. Full context: `docs/PROJECT_CONTEXT.md`.

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Presentation — src/app/[locale], src/components        │
├─────────────────────────────────────────────────────────┤
│  Proxy / Gate — src/proxy.ts (i18n + JWT RBAC)          │
├─────────────────────────────────────────────────────────┤
│  Domain Services — src/lib/* (auth, courses, revenue…)  │
├─────────────────────────────────────────────────────────┤
│  Data Access — Supabase clients, typed queries          │
├─────────────────────────────────────────────────────────┤
│  Persistence — Supabase Postgres + RLS (migrations/)    │
├─────────────────────────────────────────────────────────┤
│  Providers — video (Vimeo/R2), R2 storage, FCM, Resend  │
└─────────────────────────────────────────────────────────┘
```

---

## Important Folders

| Path | Purpose |
|------|---------|
| `src/app/[locale]/` | Locale-prefixed pages and layouts |
| `src/app/api/` | Route handlers (playback, studio, webhooks, AI) |
| `src/lib/` | Domain logic, Supabase helpers, integrations |
| `src/lib/auth/` | Claims sync, proxy RBAC, session refresh |
| `src/lib/video/` | Playback sessions, encryption, watermark, HLS |
| `src/lib/video-providers/` | Provider registry, Vimeo/R2 adapters |
| `src/lib/storage/` | R2 / object storage helpers |
| `src/lib/revenue/` | Commission engine, snapshots |
| `src/components/` | UI (shadcn + feature components) |
| `src/types/` | Shared TypeScript interfaces |
| `src/locales/` | i18n JSON (`ar`, `en`) |
| `supabase/migrations/` | Ordered SQL migrations |
| `Wails App/` | Desktop video studio (Go + frontend) |
| `loadtest/k6/` | k6 load-test scripts |
| `scripts/` | One-off ops (e.g. claims backfill) |

---

## Supabase Clients

| Client | File | Use |
|--------|------|-----|
| Cookie SSR | `src/lib/supabase/server.ts` | Authenticated server components/actions |
| Browser | `src/lib/supabase/client.ts` | Client components |
| Anonymous public | `src/lib/supabase/public.ts` | Cookieless reads for cacheable public data |
| Service role (admin) | `src/lib/supabase/admin.ts` | **Server only** — bypasses RLS; never client-side |

---

## Caching

- Public listings / landing: `unstable_cache` + `createPublicClient()` (no cookies → ISR-friendly)
- Proxy maintenance flag: 30s in-memory TTL
- Authenticated nav: JWT `app_metadata` claims avoid repeated `public.users` reads

---

## Video Provider Approach

```
Lesson → video-asset-service → provider-registry → Vimeo | R2
                                      ↓
                            playback-session + key routes
                                      ↓
                            BsPlatformVideoPlayer (hls.js)
```

- Factory: `src/lib/video-providers/provider-factory.ts`
- Settings / health: `provider-settings.ts`, `provider-health.ts`
- Webhooks: `/api/webhooks/vimeo`

---

## Auth Claims Approach

```
public.users (canonical)
       ↓ syncUserAuthClaims()
auth.users.app_metadata (JWT projection)
       ↓ getClaims() in proxy
decideProxyAuth() — no DB hit when claims complete
```

Backfill: `npm run auth:claims:backfill` · Tests: `src/lib/auth/__tests__/`

---

## Testing & Load Tests

| Tool | Command / path |
|------|----------------|
| Unit | `npm test` (Vitest) |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| k6 public | `loadtest/k6/public-browsing.js` |
| k6 auth nav | `loadtest/k6/authenticated-navigation.js` |
| k6 mixed | `loadtest/k6/mixed-platform.js` |

Report template: `docs/load-test-auth-rbac-results.md`

---

## API Surface (high level)

- **Playback:** `/api/courses/[courseId]/lessons/[lessonId]/playback/*`
- **Studio CMS:** `/api/studio/cms/*`, `/api/studio/upload/*`
- **Instructor:** `/api/instructor/*`
- **Admin:** `/api/admin/*`
- **AI:** `/api/chat/*`, `/api/cv/*`, `/api/instructor/ai/*`
- **Push:** `/api/push/*`
- **Webhooks:** `/api/webhooks/vimeo`
