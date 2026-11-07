# Performance — report BS-28

The complaint was "the whole platform is slow", escalated from BS-05 (auth pages
only). This is what was measured on production (`bs-platform.com`), what was
changed, and what the next lever is.

## Target

**A page is interactive within 2 seconds on a normal connection.**

Working budget behind that target:

| Budget | Target | Where it stood |
| --- | --- | --- |
| Server response (TTFB, measured on the server) | < 200 ms | 50–120 ms ✅ |
| HTML transferred | < 100 kB gzip | 70 kB ✅ |
| First-load JavaScript | < 300 kB gzip | 396 kB → 379 kB ⚠️ |

## What was measured

**Server response time** — `curl` against `127.0.0.1:3000` on the box, so no
network latency, three runs each:

```
/ar          0.062  0.075  0.060
/ar/courses  0.085  0.059  0.119
/ar/jobs     0.071  0.063  0.050
/ar/services 0.086  0.057  0.057
/ar/community 0.063 0.054  0.055
/ar/login    0.077  0.063  0.070
```

The server is not the bottleneck. From a client the same pages measure
0.33–0.60 s TTFB — the difference is network distance to the datacenter, not
render time.

**Machine load** — 6 vCPU, 12 GB RAM, load average 1.02. No container above 7%
CPU. Not resource-constrained.

**Database cost** — `pg_stat_statements` + `pg_stat_user_tables`:

- The heaviest query on the box is Supabase Realtime's WAL poll (1,215 s total
  over 111,896 calls, 10.9 ms each). It is infrastructure, not app queries, and
  the app genuinely uses Realtime (notifications and messaging), so it stays.
- Application queries are all sub-20 ms. The dataset is still small (30 users,
  5 courses), so sequential scans on the listing tables are Postgres choosing
  correctly, not a missing index.
- `video_processing_jobs` had 45,428 sequential scans over six rows — the
  transcoding worker polling.

**Client payload** — the real problem. The landing page shipped **436 kB of
gzipped JavaScript across 30 chunks**, of which 40 kB is the legacy polyfill
bundle that modern browsers skip (`noModule`), so ~396 kB actually loads.

Breakdown of that 396 kB:

| Size (gzip) | What |
| --- | --- |
| 63 kB | react-dom |
| 61 kB | Next.js App Router runtime |
| 53 kB | @supabase/supabase-js (auth session + realtime) |
| 40 kB | framer-motion (landing animations) |
| 27 kB | **zod — on every page, including the landing page** |
| ~152 kB | app code and UI components |

## What was changed

1. **zod removed from the global import path.** `lib/utils` re-exported
   `iqdPriceSchema` from `lib/format-number`, which imported zod. Because every
   component imports `cn` from `lib/utils`, zod was pulled into the first load of
   every page. The helper moved to `src/lib/money-schema.ts`, imported only by
   the three form-schema modules that need it. Landing-page JS: **396 kB →
   379 kB**, and zod no longer appears in any landing-page chunk.
2. **`optimizePackageImports`** for `lucide-react`, `framer-motion`, `date-fns`,
   `recharts`, `sonner` and `@base-ui-components/react` (`next.config.ts`), so
   barrel imports resolve per-module.
3. **Modern image formats** — `images.formats: ['image/avif', 'image/webp']`
   with a one-day `minimumCacheTTL`. Course thumbnails and avatars are the
   heaviest assets once real content is loaded.
4. **Indexes** — `supabase/migrations/090_listing_indexes.sql` covers the
   listing queries (courses by status/date/category/instructor, jobs by
   status/date/poster, services by status/date), the curriculum walk
   (`course_sections`, `lessons` by course + order) and the polled
   `video_processing_jobs`. They matter as the dataset grows, not today.

Already correct, verified rather than changed: HTML is gzipped by nginx
(295 kB → 70 kB), and `/_next/static` is served `public, max-age=31536000,
immutable`.

Things tried that did **not** help, and were reverted: a modern `browserslist`
in `package.json`. The polyfill chunk is tagged `noModule`, so modern browsers
never download it and the change bought nothing.

## Next lever

Getting under the 300 kB budget means attacking the two remaining app-side
blocks:

- **framer-motion (40 kB).** The landing animations (`components/home/journey-timeline`,
  `components/home/hero-journey`, `components/landing`) are mostly below the
  fold. Loading those sections through `next/dynamic` moves the library off the
  critical path. It touches 26 files and the animations are the client-facing
  showcase, so it wants its own change and its own visual review.
- **@supabase/supabase-js (53 kB).** Needed on first paint only for the session
  check. Deferring the realtime portion (notifications, messaging) until after
  hydration would split most of it out.

Neither is a config flag; both are refactors worth doing deliberately.
