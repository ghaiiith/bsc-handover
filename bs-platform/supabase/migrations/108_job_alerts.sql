-- Round 9 (BS-104): opt-in alerts when a newly published job — including a
-- Telegram-sourced import — matches a candidate at 80% or more.
--
-- Preferences live on the candidate; deliveries are logged by id + status
-- only, so the audit trail carries no candidate data beyond the user id.

alter table users
  add column if not exists job_alerts_enabled boolean not null default false,
  add column if not exists job_alerts_min_score integer not null default 80,
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_expires_at timestamptz;

create index if not exists users_job_alerts_idx on users (job_alerts_enabled) where job_alerts_enabled;
create unique index if not exists users_telegram_link_code_idx on users (telegram_link_code) where telegram_link_code is not null;

create table if not exists job_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  channel text not null,               -- in_app | telegram | email
  status text not null,                -- sent | skipped_plan | skipped_unlinked | failed
  score integer not null,
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, job_id, channel)
);
create index if not exists job_alert_deliveries_job_idx on job_alert_deliveries (job_id);
alter table job_alert_deliveries enable row level security;
drop policy if exists job_alert_deliveries_own on job_alert_deliveries;
create policy job_alert_deliveries_own on job_alert_deliveries for select using (auth.uid() = user_id);

-- Cursor for the alert sweep so each run only looks at jobs published since
-- the previous one.
insert into platform_settings (key, value)
values ('job_alerts_last_run', '1970-01-01T00:00:00Z')
on conflict (key) do nothing;
