# AI Quickstart — Business Skills Platform

Paste this at the start of a new Cursor chat, or tell the agent: **"Follow docs/AI_QUICKSTART.md"**

---

## Before Working

Read (in order):

1. `.cursor/rules/business-skills-platform.mdc`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/CURRENT_STATUS.md`

Then inspect **only** files relevant to the requested task. Do not scan the whole repo.

---

## When Asked to Make a Change

1. Identify affected files (use the file map below)
2. Explain plan briefly
3. Make minimal safe edits
4. Run `npm run typecheck` and `npm test` when possible
5. Summarize changed files and verification

---

## 10-Line Platform Summary

**Business Skills** (BS Platform; legacy EduWork) is an Arabic-first bilingual education + jobs + services marketplace for Iraq. Built with Next.js 16, React 19, TypeScript, Tailwind v4, Supabase (Postgres/Auth/RLS), and next-intl. Routes live under `src/app/[locale]/`. Auth uses Supabase with `public.users` as source of truth and JWT `app_metadata` claims for fast proxy RBAC. Video is provider-agnostic (Vimeo for scale, R2 for advanced). Desktop Wails studio handles FFmpeg/HLS. Roles: student, instructor, admin, company. Brand colors: orange `#E57D17`, teal `#045F6B`.

---

## Task → Files Map

| Task | Read first |
|------|------------|
| Auth / RBAC | `src/lib/auth/`, `src/proxy.ts` |
| Video | `src/lib/video/`, `src/lib/video-providers/`, playback routes, player components |
| UI | Specific component/page only |
| Database | Relevant `supabase/migrations/` + helpers |
| Branding | `src/components/brand/`, `globals.css`, metadata, Navbar/Footer/Auth |

---

## More Docs

- `docs/ARCHITECTURE_SUMMARY.md` — technical layers and folders
- `docs/DEVELOPMENT_RULES.md` — security, video, UI, testing rules
- `docs/auth-claims-rbac.md` — JWT claims deep dive
