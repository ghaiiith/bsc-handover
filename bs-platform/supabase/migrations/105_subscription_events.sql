-- Report BS-99: plan switching could manufacture entitlement time.
--
-- Two problems fed it: activating the free plan expired a paid subscription
-- that still had days left, and every switch back to a paid plan burned another
-- admin-granted free month. With the platform-wide grant at 2 months, toggling
-- Free -> Pro -> Free -> Pro handed out two unpaid months.
--
-- This table gives every entitlement change an auditable record so a disputed
-- period can be reconstructed, and it is what the reviewer asked for by
-- "an auditable plan-change record".

create table if not exists employer_subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subscription_id uuid references employer_subscriptions(id) on delete set null,
  plan_id uuid references employer_plans(id) on delete set null,
  -- What was attempted: paid_activation | free_grant | free_plan |
  -- blocked_paid_active | blocked_no_allowance
  event_type text not null,
  -- Entitlement window before and after, so a jump is visible at a glance.
  previous_period_end timestamptz,
  new_period_end timestamptz,
  free_months_consumed integer not null default 0,
  amount numeric(12, 2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists employer_subscription_events_user_idx
  on employer_subscription_events (user_id, created_at desc);

alter table employer_subscription_events enable row level security;

-- Companies read their own history; nobody writes through the anon/auth roles.
-- All writes go through the service-role client in the payment path.
drop policy if exists employer_subscription_events_select_own on employer_subscription_events;
create policy employer_subscription_events_select_own
  on employer_subscription_events for select
  using (auth.uid() = user_id);

drop policy if exists employer_subscription_events_admin_select on employer_subscription_events;
create policy employer_subscription_events_admin_select
  on employer_subscription_events for select
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );
