# Business Skills — Server Runbook

Operational guide for `169.58.37.33` (bs-platform.com). Companion to
`HANDOVER.md` — that file explains the codebase, this one explains the box.

---

## 1. Access

```bash
ssh root@169.58.37.33          # password delivered separately
```

**Do this on day one:** add your SSH public key, then disable password
authentication — the root password has been shared over chat and must be
rotated regardless.

```bash
ssh-copy-id root@169.58.37.33
# then on the server:
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

---

## 2. Layout

| Path | What |
|---|---|
| `/opt/bs-platform` | Next.js app (`src/`, `.next/`, `.env.local`, `node_modules/`) |
| `/opt/supabase` | Supabase `docker-compose.yml` + volumes |
| `/etc/nginx/sites-available/bsplatform` | reverse proxy + TLS |
| `/etc/letsencrypt/live/bs-platform.com/` | certificates (Certbot auto-renew) |
| `/root/backups/` | manual database dumps |
| `/tmp/b*.log` | build logs (transient) |

---

## 3. Daily operations

```bash
# health
systemctl status bs-platform
systemctl is-active nginx docker
docker ps --format '{{.Names}}\t{{.Status}}'      # expect 11 Supabase containers

# logs
journalctl -u bs-platform -f                       # app
journalctl -u bs-platform --since '1 hour ago' | grep -i error
docker logs --tail 100 supabase-db
tail -f /var/log/nginx/error.log

# restart (≈10s downtime)
systemctl restart bs-platform

# disk / memory
df -h /; free -h
du -sh /opt/bs-platform/.next /var/lib/docker
```

**Expected steady state:** ~3 GB of 11 GB RAM used, ~26 GB of 193 GB disk,
zero `error` lines per hour in the app journal.

---

## 4. Deploying a change

```bash
# On your machine, from the repo root — list only the files you changed:
rsync -az --files-from=<(printf 'lib/foo.ts\ncomponents/Bar.tsx\n') src/ \
  root@169.58.37.33:/opt/bs-platform/src/

# Build detached on the server (4-8 minutes; it WILL outlive your SSH session)
ssh root@169.58.37.33 "cd /opt/bs-platform && rm -f /tmp/b.log && \
  nohup bash -c 'npm run build > /tmp/b.log 2>&1; echo EXIT=\$? >> /tmp/b.log' >/dev/null 2>&1 &"

# Poll until it prints EXIT=0, then restart
ssh root@169.58.37.33 "grep -m1 '^EXIT=' /tmp/b.log"
ssh root@169.58.37.33 "systemctl restart bs-platform"
```

**Rules:**
- Run `npm run typecheck` and `npm test` locally first. A failed build leaves
  a half-written `.next` and the old process keeps serving — recoverable, but
  you will not notice until you restart.
- Never run `npm run build` in the foreground over SSH.
- If a build fails: `grep -iE 'Failed to compile|Type error' /tmp/b.log`.

---

## 5. Database

```bash
# psql
docker exec -it supabase-db psql -U postgres -d postgres

# apply a migration
scp supabase/migrations/112_x.sql root@169.58.37.33:/tmp/
ssh root@169.58.37.33 "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/112_x.sql"

# quick facts
docker exec supabase-db psql -U postgres -d postgres -c \
  "select count(*) users from users; select count(*) jobs from jobs where status='active';"
```

### Backup

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/backups
docker exec supabase-db pg_dump -U postgres -d postgres --clean --if-exists \
  > /root/backups/db-$STAMP.sql
gzip /root/backups/db-$STAMP.sql
ls -lh /root/backups/ | tail -3
```

**There is no automated backup.** Set one up — a nightly cron of the above
plus off-site copy is the single most valuable ops improvement available.

### Restore

```bash
zcat /root/backups/db-STAMP.sql.gz | docker exec -i supabase-db psql -U postgres -d postgres
systemctl restart bs-platform
```

### Foreign-key delete order (learned the hard way)

Deleting course data fails unless children go first:

```
lesson_bookmarks/discussions/qa_threads → quiz_attempts → final_exam_submissions
→ quiz_questions → course_quizzes → course_assignments → lesson_progress
→ lesson_encryption_keys/content_protection/playback_sessions/video_*
→ course_resources/wishlists/completions → certificates → reviews
→ coupon_redemptions/discount_logs/course_discounts/academy_purchases
→ enrollments  (BEFORE payments — enrollments.payment_id → payments)
→ payments → coupons → lessons → course_sections → courses
```

For jobs: null `imported_jobs.published_job_id` first, then `job_applications`,
`saved_jobs`, then the jobs themselves.

---

## 6. Supabase stack

```bash
cd /opt/supabase
docker compose ps
docker compose restart supabase-rest      # restart one service
docker compose up -d                      # bring everything up
```

**Do not `docker compose down -v`** — `-v` destroys the database volume.

If PostgREST starts returning schema errors after a migration, reload its
cache:

```bash
docker exec supabase-db psql -U postgres -d postgres -c "notify pgrst, 'reload schema';"
```

---

## 7. nginx & TLS

```bash
nginx -t && systemctl reload nginx
certbot renew --dry-run                   # auto-renew is already configured
```

Routing: `/` → `127.0.0.1:3000` (Next.js), `/supabase/` → `127.0.0.1:8000`
(Kong). HTTP/2 and gzip are enabled — this was a real page-speed fix, do not
remove it.

---

## 8. Scheduled jobs

```bash
crontab -l                                 # 10 entries, all Bearer $CRON_SECRET

# run one by hand
curl -s -H "Authorization: Bearer $(grep -m1 '^CRON_SECRET=' /opt/bs-platform/.env.local | cut -d= -f2-)" \
  https://bs-platform.com/api/cron/job-alerts
```

Each endpoint returns JSON with what it did. They are idempotent and safe to
re-run.

---

## 9. Troubleshooting

| Symptom | First checks |
|---|---|
| 502 from nginx | `systemctl status bs-platform` — app down or mid-restart |
| App up, data missing | Look for `42501 permission denied for table users` in the journal → column GRANT trap (`HANDOVER.md` §4.1) |
| Change not visible | ISR cache — wait 120 s, or verify via the API route instead of the page |
| Build "succeeds" but old code serves | `.next` was rebuilt but the service was not restarted |
| Email silently not sending | `RESEND_API_KEY` is empty (`HANDOVER.md` §9.1) |
| AI feature errors | Check which microservice: TrainerStudio ✅ / learning_assistant ✅ / CV Builder ❌ |
| Admin cannot log in | Single-session is **exempt for admins** in `src/proxy.ts`; if this regresses, two admins will kick each other out |

### Useful one-liners

```bash
# errors in the last hour
journalctl -u bs-platform --since '1 hour ago' | grep -iE 'error|unhandled' | tail -30

# which chat provider answered / why it failed
journalctl -u bs-platform --since '30 min ago' | grep -E 'chat/general|chat-fallback'

# page timing from outside
curl -s -o /dev/null -w 'TTFB=%{time_starttransfer}s total=%{time_total}s\n' https://bs-platform.com/ar
```

---

## 10. Accounts

Two admin accounts exist. **Rotate both passwords immediately** — they have
been shared over chat.

```bash
# reset an admin password via GoTrue
ANON=$(grep -m1 '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' /opt/bs-platform/.env.local | cut -d= -f2-)
SERVICE=$(grep -m1 '^SUPABASE_SERVICE_ROLE_KEY=' /opt/bs-platform/.env.local | cut -d= -f2-)
UID=$(docker exec supabase-db psql -U postgres -d postgres -t -A -c \
  "select id from auth.users where email='admin@bsplatform.local';")
curl -s -X PUT "http://127.0.0.1:8000/auth/v1/admin/users/$UID" \
  -H "apikey: $ANON" -H "Authorization: Bearer $SERVICE" \
  -H 'Content-Type: application/json' \
  -d '{"password":"NEW-STRONG-PASSWORD","email_confirm":true}'
```

Creating a new admin needs **three** things, or the JWT will not carry the
role: a GoTrue user, a `public.users` row with `role='admin'`, and
`app_metadata.role='admin'` set through the admin API.

---

## 11. Security checklist for the new owner

- [ ] Rotate the root SSH password; switch to key-only auth
- [ ] Rotate both admin account passwords
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` if it has ever been shared
- [ ] Set up automated nightly database backups with off-site copies
- [ ] Never rotate `VIDEO_KEY_MASTER_SECRET` — it derives the AES keys for
      already-encrypted lesson video; changing it makes existing video
      unplayable
- [ ] Keep `.env.local` out of git (it is `.gitignore`d — verify after any
      `.gitignore` edit)
