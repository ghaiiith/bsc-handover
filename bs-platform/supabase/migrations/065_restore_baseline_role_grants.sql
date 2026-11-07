-- 065_restore_baseline_role_grants.sql
-- Restore the standard Supabase table-level privileges for `anon` and
-- `authenticated`.
--
-- On a hosted Supabase project every table in `public` is granted to
-- anon/authenticated/service_role at init, and Row Level Security (enabled on
-- all 53 tables here) is the actual security boundary. On this local stack those
-- baseline grants were missing — anon/authenticated held only
-- REFERENCES/TRIGGER/TRUNCATE and NO SELECT/INSERT/UPDATE/DELETE — so every
-- logged-in read failed (e.g. the notifications bell 403'd) and the post-login
-- profile/claims sync could not run. RLS remains fully in force; these grants
-- only let RLS do its job.
--
-- `public.users` is deliberately NOT re-opened here: its column-level PII lockdown
-- (migrations 028 / 0440 / 061) and the "no UPDATE for authenticated" invariant
-- (which blocks self-escalation of is_active/role/onboarding_completed) are
-- preserved by re-revoking table-level DML on users after the blanket grant.

-- 1) Baseline grants on all existing tables (RLS restricts the actual rows).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Sequences (needed for INSERTs into tables with serial/identity columns).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 2) Preserve the users-table hardening the blanket grant above would have undone.
--    NOTE: `REVOKE SELECT ON <table>` also drops column-level SELECT grants, so
--    after revoking we must re-apply the exact column-scoped SELECT from
--    migrations 028 (anon) and 061 (authenticated). email + phone stay excluded.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.users FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.users FROM authenticated;

-- anon: public, non-PII profile columns (mirror of migration 028).
GRANT SELECT (
  id, full_name, full_name_ar, avatar_url, role, bio, bio_ar, is_active,
  created_at, headline, skills, location, availability, portfolio_slug,
  portfolio_is_public
) ON public.users TO anon;

-- authenticated: everything except email + phone (mirror of migration 061).
GRANT SELECT (
  id, full_name, full_name_ar, avatar_url, role, bio, bio_ar, is_active,
  created_at, headline, skills, experience, education, projects, links,
  preferred_role, location, years_of_experience, availability,
  profile_completed_at, preferences, portfolio_is_public, portfolio_slug,
  account_type, onboarding_completed, onboarding_completed_at, primary_goal,
  skill_level, interests, discovery_source, discovery_source_other,
  onboarding_version, onboarding_updated_at, instructor_intent, company_intent,
  freelancer_intent, onboarding_company_name, onboarding_company_industry,
  onboarding_company_size, onboarding_meta
) ON public.users TO authenticated;

-- 3) Default privileges so future tables/sequences created by later migrations
--    (as the postgres role) inherit the same baseline automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, anon;
