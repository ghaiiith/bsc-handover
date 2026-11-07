-- ============================================================================
-- 071_video_leak_alerts.sql
-- Records automated content-leak / abuse alerts raised by the periodic scan of
-- video_security_logs (session sharing across many IPs, device-mismatch bursts,
-- key/hotlink probing). Used to dedupe repeat alerts and give admins an audit
-- trail. Service-role only.
-- ============================================================================

create table if not exists public.video_leak_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  window_minutes int not null default 60,
  created_at timestamptz not null default now()
);

create index if not exists idx_video_leak_alerts_user
  on public.video_leak_alerts (user_id, reason, created_at desc);

alter table public.video_leak_alerts enable row level security;
revoke all on public.video_leak_alerts from anon, authenticated;
-- Admins may read alerts in the dashboard; only the service role writes them.
grant select on public.video_leak_alerts to authenticated;

drop policy if exists video_leak_alerts_admin_read on public.video_leak_alerts;
create policy video_leak_alerts_admin_read
  on public.video_leak_alerts
  for select
  to authenticated
  using (public.get_user_role() = 'admin');
