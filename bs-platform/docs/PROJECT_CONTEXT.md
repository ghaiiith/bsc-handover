# Business Skills — Project Context

Main memory file for AI agents and developers. Read this before exploring the codebase.

**Quick entry:** `docs/AI_QUICKSTART.md` · **Architecture:** `docs/ARCHITECTURE_SUMMARY.md` · **Status:** `docs/CURRENT_STATUS.md` · **Agent rules:** `docs/DEVELOPMENT_RULES.md`

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Official name | **Business Skills** |
| Short name | **BS Platform** |
| Legacy name | EduWork (being phased out in UI) |
| Audience | Iraqi users; Arabic-first, English supported |
| Purpose | Education + jobs + services marketplace with certificates, AI assistance, and instructor tools |

Brand constants: `src/lib/brand/constants.ts`

---

## 2. Product Modules

| Module | Route area / notes |
|--------|-------------------|
| Public landing | `(public)/` — marketing, trust, CTA |
| Courses | `/courses`, course detail, enrollment |
| Learning player | `(student)/learn/[courseSlug]/[lessonSlug]` |
| Certificates | `/certificate/[code]`, dashboard certificates |
| Jobs board | `/jobs` — scraping, applications, company postings |
| Services marketplace | `/services` — orders, seller flows |
| Instructor dashboard | `(instructor)/instructor/` — course CMS, studio |
| Video Studio | Instructor course studio + `Wails App/` desktop tooling |
| Admin dashboard | `/admin` — users, payments, settings, imports |
| Student dashboard | `(student)/dashboard/` — courses, orders, company jobs |
| Company / employer | Company role flows, job posting, affiliations |
| CV builder | `/cv-builder` — AI-assisted CV creation |
| Community | `/community` |
| Notifications | In-app bell + Firebase FCM push |
| AI chatbot | General chat + course assistant (`src/lib/chat/`, `/api/chat/`) |

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Framer Motion |
| i18n | next-intl (`ar` default, `en`) |
| Database / Auth | Supabase Postgres, Auth, RLS, Realtime |
| Hosting | Vercel |
| Object storage | Cloudflare R2 (course video assets) |
| Video CDN | Vimeo (primary high-traffic) |
| Desktop Studio | Wails App (`Wails App/`) — FFmpeg, HLS, encryption, upload |
| Push | Firebase FCM |
| Email | Resend |
| AI | Anthropic Claude (chat, CV, course generation) |
| Playback | hls.js, Plyr, custom `BsPlatformVideoPlayer` |
| Payments | ZainCash, QiCard (IQD) |
| Testing | Vitest; k6 load tests (`loadtest/k6/`) |

---

## 4. Routing Model

All user-facing routes live under **`src/app/[locale]/`** with locale prefix (`/ar/...`, `/en/...`).

**Route groups:**

| Group | Path pattern | Purpose |
|-------|--------------|---------|
| `(auth)` | login, register, verify-email, reset-password | Authentication |
| `(public)` | landing page | Marketing |
| `(student)` | dashboard, learn | Student experience |
| `(instructor)` | instructor/* | Instructor tools |
| `admin` | admin/* | Platform administration |
| Public verticals | courses, jobs, services, community, cv-builder, certificate | Unauthenticated or mixed |

**APIs:** `src/app/api/**` — REST route handlers (playback, studio CMS, webhooks, AI, push, etc.)

**Proxy / gate:** `src/proxy.ts` (i18n + auth RBAC + maintenance mode)

---

## 5. Authentication and RBAC

- **Supabase Auth** with cookie-based SSR sessions
- **`public.users`** is the canonical profile table (role, `is_active`, profile fields)
- **JWT `app_metadata`** holds cached authorization claims (server-controlled):

| Claim | Purpose |
|-------|---------|
| `role` | `student` \| `instructor` \| `admin` \| `company` |
| `is_active` | Account enabled / suspended |
| `profile_status` | `active` \| `suspended` |
| `claims_version` | Bumps on role/active changes |
| `claims_updated_at` | ISO timestamp of last sync |

**Decision flow (`src/proxy.ts`):**

1. i18n middleware
2. Public + no auth cookie → fast path
3. `getClaims()` → parse `app_metadata`
4. Claims complete → allow/redirect **without** `public.users` query
5. Claims incomplete → one DB fallback + schedule backfill
6. Fail-safe: privileged routes deny when role cannot be proven

**Never use `user_metadata` for authorization.**

Inactive users redirect to `/account-suspended`.

Deep dive: `docs/auth-claims-rbac.md` · Helpers: `src/lib/auth/sync-user-claims.ts`

---

## 6. Roles

| Role | High-level access |
|------|-------------------|
| `student` | Dashboard, learning player, enrollments, CV, service orders |
| `instructor` | Instructor shell, course CMS, studio, video management, revenue views |
| `admin` | Full admin panel — users, courses, payments, imports, platform settings |
| `company` | Employer flows — job posting, company affiliation, candidate tools |

Capabilities: `src/lib/auth/role-capabilities.ts` · RLS enforces data-layer authority.

---

## 7. Video Architecture

**Provider-agnostic layer:** `src/lib/video-providers/` (registry, factory, Vimeo + R2 implementations)

| Provider | Role |
|----------|------|
| Vimeo | Primary CDN for high-traffic course delivery |
| R2 | Advanced/custom pipeline, backup, signed delivery |
| Stubs | Mux, Bunny, AWS, Cloudinary, Backblaze (future) |

**Principles:**

- Next.js authorizes and serves metadata/sessions — **not** heavy video bytes when avoidable
- R2 proxied HLS through Next.js can bottleneck under load; prefer Vimeo CDN for scale
- Secure video: playback sessions, watermark config, AES/HLS encryption where applicable
- Desktop **Wails App** handles FFmpeg transcoding, HLS packaging, encryption, bulk upload

Key paths: `src/lib/video/`, `src/app/api/courses/.../playback/`, `src/components/video-player/`

---

## 8. Video Studio

Dedicated video management workspace (replaces small inline video card in lesson editor).

**Web studio:** `(instructor)/instructor/courses/[id]/studio/` + `/api/studio/*`

**Desktop studio:** `Wails App/` — upload, replace, processing queue, timeline, chapters, resources, playback config, protection, analytics, versions, activity, advanced metadata.

Constants: `src/lib/video-studio/constants.ts`

---

## 9. Learning Player

- Provider-aware playback (`BsPlatformVideoPlayer`, hls.js)
- Progress tracking, bookmarks, curriculum sidebar
- AI course assistant panel
- Mobile UX priority: **video first** → lesson navigation → curriculum (bottom sheet/tab) → AI (secondary drawer/tab)

Key components: `src/components/courses/LessonPlayerShell.tsx`, `LearnWorkspaceLayout.tsx`, mobile header/sheet/action bar components.

---

## 10. Revenue / Commission

- **No hardcoded global 70/30 split** — instructor agreements define terms
- Gateway fees deducted first; immutable financial snapshots at transaction time
- Engine: `src/lib/revenue/commission-engine.ts`, `apply-snapshot.ts`
- `public.users` / profile for role; **financial snapshots** are historical truth for payments

---

## 11. Performance Architecture

| Pattern | Where |
|---------|-------|
| `unstable_cache` + cookieless client | Public listings, landing (`createPublicClient()`) |
| JWT claims-first proxy | `src/proxy.ts` — avoids per-nav `public.users` lookup |
| Dynamic rendering trap | Listing pages that read cookies disable ISR — see `docs/PERFORMANCE_AUDIT.md` |

**Main load risks:**

1. R2 proxied HLS video through app servers
2. Supabase authenticated query fan-out
3. AI endpoints (Claude)
4. Analytics/progress write frequency

**Mitigation:** Vimeo/CDN for video concurrency; claims backfill; cache public HTML; DB indexes (migration `031`).

---

## 12. Branding

Rebrand **EduWork → Business Skills** in progress.

| Token | Hex | Usage |
|-------|-----|-------|
| Orange | `#E57D17` / `#E3791A` | Primary, current, action, CTAs |
| Teal | `#045F6B` / `#02515B` | Growth, verified, success, supporting |

Logo: vector SVG at `/logo-traced.svg` — not raster. Components: `src/components/brand/`.

---

## 13. Development Principles

- Do not break existing flows; prefer small incremental changes
- Security fail-safe; RLS stays enabled
- Server-only helpers for secrets and admin operations
- Provider abstraction for video and storage
- Tests for critical auth / video / payment changes
- Document major architectural changes under `docs/`

---

## Token-Saving: What to Read per Task

| Task type | Read first |
|-----------|------------|
| Auth / RBAC | `src/lib/auth/`, `src/proxy.ts`, `docs/auth-claims-rbac.md` |
| Video | `src/lib/video/`, `src/lib/video-providers/`, playback routes, player components |
| UI | Specific component/page only; brand files if visual |
| Database | Relevant `supabase/migrations/` + `src/lib/` data helpers |
| Branding | `src/components/brand/`, `globals.css`, metadata, Navbar/Footer/Auth/homepage |

Do **not** load the entire repo into context.
