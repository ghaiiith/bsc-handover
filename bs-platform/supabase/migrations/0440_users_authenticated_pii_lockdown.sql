-- 044_users_authenticated_pii_lockdown.sql
-- Closes the residual risk tracked in 028_users_pii_lockdown.sql:
--   "the `authenticated` role still has full column access. A logged-in user can
--    therefore still read another user's email via the REST API."
--
-- 028 only column-locked the `anon` role. Because the row policy
-- `users_public_read ON users FOR SELECT USING (true)` exposes every row, any
-- authenticated user could call the Supabase REST API with their own JWT and
-- harvest every other user's `email` and `phone`.
--
-- Fix (mirrors 028 for the authenticated role): replace the blanket table-level
-- SELECT grant with a column-scoped one that excludes the contact PII columns
-- (`email`, `phone`). Cross-user reads needed by the app (instructor / seller /
-- reviewer / counterparty name, avatar, professional profile) use only the
-- granted columns and keep working.
--
-- Own-profile flows that genuinely need `email`/`phone` now read through the
-- SECURITY DEFINER `get_my_profile()` function below, which is scoped to
-- `auth.uid()` and bypasses the column grant for the caller's OWN row only.
--
-- Legitimate cross-user PII (service-order buyer/seller contact) is served
-- server-side via the service-role admin client, gated by buyer/seller checks in
-- application code (see src/lib/services/get-orders.ts).

-- 1) Re-scope SELECT for the authenticated role: everything EXCEPT email + phone.
REVOKE SELECT ON public.users FROM authenticated;

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
  experience,
  education,
  projects,
  links,
  preferred_role,
  location,
  years_of_experience,
  availability,
  profile_completed_at,
  preferences,
  portfolio_is_public,
  portfolio_slug
) ON public.users TO authenticated;

-- 2) Own full profile (including email + phone) via a definer function scoped to
--    the caller. Returns a single row (or NULL when the profile does not exist).
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
