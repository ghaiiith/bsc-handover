# Supabase Setup Order

Run these in **Supabase Dashboard → SQL Editor → New Query**, **in this order**:

| Step | File | Purpose |
|------|------|---------|
| 1 | `migrations/001_schema.sql` | Creates all tables (`users`, `courses`, `jobs`, etc.) |
| 2 | `migrations/002_rls.sql` | Row Level Security policies |
| 3 | `migrations/003_course_rejection_reason.sql` | Course rejection fields |
| 4 | `migrations/004_payment_indexes_rls.sql` | Payment indexes + RLS |
| 5 | `migrations/005_jobs_indexes.sql` | Jobs indexes |
| 6 | `migrations/006_services_indexes.sql` | Services indexes |
| 7 | `migrations/007_platform_settings.sql` | Platform settings table |
| 8 | `migrations/008_job_contact_fields.sql` | Job contact columns |
| 9 | `migrations/009_users_insert_own.sql` | Profile insert policy (optional fix) |
| 10 | `migrations/010_jobs_required_columns.sql` | Job `updated_at` + contact columns (required for job save) |
| 11 | `migrations/011_enrollments_read_policies.sql` | Enrollment counts on course listings |
| 12 | `migrations/012_fix_signup_trigger.sql` | Fixes signup / profile creation trigger |
| 13 | `migrations/013_course_sections_rls.sql` | Section RLS (required for curriculum step) |
| 14 | `migrations/014_course_storage_buckets.sql` | Thumbnail storage bucket + policies (videos use Cloudflare R2) |
| 48 | `migrations/048_video_assets_r2.sql` | `video_assets` table + lesson/course FKs + RLS (Cloudflare R2) |

## Quick check — do tables exist?

Run this first:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see `users`, `courses`, `jobs`, `services`, `notifications`, etc.

If `users` is missing → run **001_schema.sql** before anything else.

## After schema is applied

1. Enable **Realtime** on `notifications` (Database → Replication).
2. **Storage**: migration `014` creates the `course-thumbnails` bucket (images only). **Course videos use Cloudflare R2** (private bucket, S3-compatible) — configure env vars below. Migration `048` adds the `video_assets` table.
3. **Cloudflare R2** (course videos): create a **private** bucket, then generate an S3 API token (Account → R2 → Manage R2 API Tokens). Set in `.env.local`:
   - `R2_ACCOUNT_ID` — your Cloudflare account id
   - `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — from the R2 API token
   - `R2_BUCKET_NAME` — the private bucket name
   - `R2_ENDPOINT` — optional; defaults to `https://<account_id>.r2.cloudflarestorage.com`
   - `R2_PUBLIC_BASE_URL` — optional custom CDN domain mapped to the bucket
   - `R2_SIGNED_URL_TTL_SECONDS` (playback, default 21600) / `R2_UPLOAD_URL_TTL_SECONDS` (upload parts, default 3600)
   - **Bucket CORS** (required for browser uploads): allow `PUT` from your app origin(s) and expose the `ETag` header. Example:
     ```json
     [{ "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600 }]
     ```
   - Keep the bucket **private** — the app serves every video through short-lived signed URLs.
4. In **Authentication → URL Configuration**, add redirect URLs:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://your-domain.com/auth/callback` (production)
4. Promote your account to **admin** after first signup (run in SQL Editor):

```sql
-- By email (must match auth.users exactly)
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Or by auth user id (most reliable)
UPDATE public.users u
SET role = 'admin'
FROM auth.users a
WHERE u.id = a.id
  AND a.email = 'your-email@example.com';

-- Verify
SELECT id, email, role FROM public.users WHERE email = 'your-email@example.com';
```

Then **log out and log back in** (or hard-refresh) so the navbar picks up the new role.

Also run `migrations/032_protect_user_role.sql` so profile edits cannot reset your role.

## Required: migration 044 (PII lockdown)

`migrations/044_users_authenticated_pii_lockdown.sql` **must be applied**. It revokes
`email` / `phone` column access from the `authenticated` role and adds the
`get_my_profile()` RPC. The application code now reads the signed-in user's own
profile through this RPC, so **if 044 is not applied, own-profile reads (login,
navbar, dashboard, profile page) will fail.** Apply it together with the
corresponding code deploy.
