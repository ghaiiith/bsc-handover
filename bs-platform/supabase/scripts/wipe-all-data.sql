-- =============================================================================
-- WIPE ALL DATA — Business Skills / BS Platform
-- =============================================================================
--
-- ⚠️  DESTRUCTIVE: Deletes ALL rows in public schema + ALL auth users.
--     Schema, RLS policies, triggers, and migrations are NOT removed.
--
-- Does NOT delete:
--   - Supabase Storage files (course-thumbnails bucket, avatars, etc.)
--   - Cloudflare R2 video objects
--
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- After wipe:
--   1. Sign up a fresh account
--   2. Promote to admin (see supabase/SETUP.md)
--   3. Re-run payment gateway seed if needed (bottom of this file)
--   4. npm run auth:claims:backfill  (after first users exist)
-- =============================================================================

BEGIN;

-- 1) Empty every table in public (keeps table definitions)
DO $wipe$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
  INTO table_list
  FROM pg_tables
  WHERE schemaname = 'public';

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
    RAISE NOTICE 'Truncated public tables: %', table_list;
  ELSE
    RAISE NOTICE 'No public tables found.';
  END IF;
END $wipe$;

-- 2) Remove all Supabase Auth users (login accounts)
--    public.users rows are already gone from TRUNCATE CASCADE above.
DELETE FROM auth.users;

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify (should return 0 for each, auth_users = 0)
-- -----------------------------------------------------------------------------
SELECT 'public.users' AS item, count(*)::bigint AS rows FROM public.users
UNION ALL
SELECT 'public.courses', count(*)::bigint FROM public.courses
UNION ALL
SELECT 'auth.users', count(*)::bigint FROM auth.users;

-- -----------------------------------------------------------------------------
-- OPTIONAL: Re-seed payment gateway defaults (migration 052)
-- Uncomment if you need checkout after a fresh wipe.
-- -----------------------------------------------------------------------------
/*
INSERT INTO payment_gateway_configs (
  gateway_id, display_name, gateway_type, percentage_fee, fixed_fee, currency, is_active
) VALUES
  ('zaincash', 'ZainCash', 'local', 0, 0, 'IQD', true),
  ('qicard', 'QiCard', 'local', 0, 0, 'IQD', true)
ON CONFLICT (gateway_id) DO NOTHING;
*/
