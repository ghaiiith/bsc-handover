-- 064_grant_service_role_table_access.sql
-- Restore full table access for the `service_role` (the trusted server-side key
-- used by createAdminClient / SUPABASE_SERVICE_ROLE_KEY).
--
-- On a hosted Supabase project the platform grants `service_role` ALL privileges
-- on every table in `public` at init. On a local `supabase start` stack, tables
-- created by these migrations ended up with only REFERENCES/TRIGGER/TRUNCATE for
-- `service_role` and NO SELECT/INSERT/UPDATE/DELETE. That breaks every server
-- path that uses the admin client — including the post-login profile/claims sync
-- (`ensureUserProfile` / `syncUserAuthClaims`), which made valid logins fail with
-- a generic "an error occurred" and no redirect.
--
-- service_role is meant to bypass RLS and hold full DML (incl. the PII columns
-- it legitimately needs for server-side cross-user contact), so grant it here and
-- via default privileges for any future tables/sequences.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
