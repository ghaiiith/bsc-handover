# Current Status — Business Skills Platform

Snapshot of what is done, what needs manual runs, and known gaps. Update this when major milestones land.

---

## Completed

| Area | Status |
|------|--------|
| JWT RBAC claims in `app_metadata` | Implemented — `src/lib/auth/sync-user-claims.ts` |
| Claims backfill script | `scripts/backfill-auth-claims.ts` |
| Proxy claims-first flow | `src/proxy.ts` + `src/lib/auth/proxy-rbac.ts` |
| Account suspended page | `/account-suspended` redirect for inactive users |
| k6 auth load-test scaffolding | `loadtest/k6/authenticated-navigation.js` |
| Video provider architecture | Registry + Vimeo + R2 (`src/lib/video-providers/`) |
| Secure video foundations | Sessions, watermark, encryption keys, protection routes |
| Desktop studio foundations | `Wails App/` — upload, processing, queue |
| Revenue agreement engine | `src/lib/revenue/` — no hardcoded 70/30 |
| Player / session improvements | Custom player, playback events, preview route |
| Auth claims documentation | `docs/auth-claims-rbac.md` |
| Performance audit | `docs/PERFORMANCE_AUDIT.md` |
| Mandatory onboarding flow (Option B) | Implemented — proxy gating, `/onboarding`, `/home`, JWT claims |
| Onboarding DB migrations | `058_user_onboarding.sql`, `059_onboarding_backfill_existing_users.sql` |

---

## Needs Manual Run

These are operational steps — not automated in CI:

```bash
# Preview backfill impact
npm run auth:claims:dry-run

# Apply claims to existing users (requires SUPABASE_SERVICE_ROLE_KEY)
npm run auth:claims:backfill
```

| Task | Notes |
|------|-------|
| k6 load tests with real credentials | Set env vars per `loadtest/k6/README.md`; run against staging/preview |
| Fill load-test report | Template: `docs/load-test-auth-rbac-results.md` |
| Apply onboarding migrations `058` + `059` | Run in Supabase SQL Editor; then `npm run auth:claims:backfill` |
| Supabase Realtime on `notifications` | Required for in-app notification bell |

---

## Known Issues / Future Work

| Item | Severity | Notes |
|------|----------|-------|
| Global lint baseline | Low | `npm run lint` may have unrelated pre-existing errors; verify changed files separately |
| Mobile learning page UX | Medium | Needs mobile-first redesign — video + nav priority |
| R2 proxied streaming at scale | High | Do not use for high-traffic courses; prefer Vimeo CDN |
| Video Studio UI | Medium | Web + Wails studio may still be WIP in places |
| New user signups | Low | `onboarding_completed=false` until `/onboarding` is finished |
| Existing users (migration 059) | Low | Backfilled as complete with `account_type` from role |
| EduWork → Business Skills rebrand | In progress | UI/metadata updating; internal `eduwork` identifiers remain |
| Production load testing | Pending | Run full k6 suite after major UI/video changes |
| Public listing ISR | Medium | Cookie reads disable `revalidate` on some list pages — see performance audit |

---

## Verification Commands

```bash
npm run typecheck   # required before build
npm test            # Vitest unit tests
npm run lint        # ESLint over src/
npm run verify      # typecheck + lint
```

---

## Related Docs

- `docs/PROJECT_CONTEXT.md` — full platform memory
- `docs/ARCHITECTURE_SUMMARY.md` — technical map
- `docs/DEVELOPMENT_RULES.md` — agent coding rules
- `docs/AI_QUICKSTART.md` — paste into new Cursor chats
