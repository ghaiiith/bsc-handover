-- ============================================================================
-- 073_revoke_internal_table_grants.sql
-- Defense in depth: several purely-internal tables are only ever read/written
-- by the service-role client, yet migration 065 left anon/authenticated with a
-- baseline SELECT grant (RLS returns no rows, so nothing leaks today). REVOKE
-- the grant outright so an accidentally-added permissive RLS policy in the
-- future can't expose them. Service-role bypasses grants, so app code is
-- unaffected (all these are accessed via createAdminClient).
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'rate_limits',
    'video_security_logs',
    'lesson_encryption_keys',
    'playback_sessions',
    'provider_health_logs',
    'community_ai_search_logs'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
