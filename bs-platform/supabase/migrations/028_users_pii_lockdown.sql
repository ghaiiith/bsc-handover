-- 028_users_pii_lockdown.sql
-- H1 fix: the `users` table was world-readable via the policy
--   users_public_read ON users FOR SELECT USING (true)   (002_rls.sql)
-- which, combined with the columns added in 018_user_profile.sql, exposed every
-- user's `email`, `phone`, and private profile JSON (experience/education/links/
-- preferences). The public anon key shipped in client JS could dump all of this
-- through the Supabase REST API.
--
-- Fix: RLS is row-level and cannot restrict columns, so we keep the row policies
-- (own-row + public read for joins) and add COLUMN-LEVEL privileges that stop the
-- `anon` role from reading PII columns. Public pages and nested joins
-- (instructor / seller / reviewer name + avatar) only need the non-PII columns
-- granted below, so they keep working. Selecting a non-granted column (e.g.
-- `email`) as `anon` now fails — the matching code paths were updated to stop
-- requesting PII on public/anonymous reads.
--
-- RESIDUAL (lower severity, tracked follow-up): the `authenticated` role still has
-- full column access. A logged-in user can therefore still read another user's
-- email via the REST API. This is relied upon by transacting flows (service-order
-- counterparties) and own-profile reads. Closing it fully requires routing
-- cross-user PII reads through a SECURITY DEFINER view/RPC.

-- Replace the blanket table-level SELECT grant for anon with a column-scoped one.
REVOKE SELECT ON public.users FROM anon;

GRANT SELECT (
  id,
  full_name,
  full_name_ar,
  avatar_url,
  role,
  bio,
  bio_ar,
  is_active,
  created_at,
  headline,
  skills,
  location,
  availability,
  portfolio_slug,
  portfolio_is_public
) ON public.users TO anon;
