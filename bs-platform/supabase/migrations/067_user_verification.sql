-- 067_user_verification.sql
-- Verified badge for trusted instructors / companies / freelancers / sellers.
-- Set by admins only (the users table has no UPDATE grant for authenticated, so
-- only the service-role admin path can change it — see 065).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Public, non-PII flag: readable cross-user by anon + authenticated.
GRANT SELECT (is_verified) ON public.users TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_users_is_verified
  ON public.users (is_verified) WHERE is_verified = true;
