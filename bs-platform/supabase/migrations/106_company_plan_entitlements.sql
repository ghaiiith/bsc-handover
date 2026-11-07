-- Round 9 (BS-106, BS-107, BS-109, BS-110, BS-111): company plans become a
-- real entitlement model instead of a price + a concurrent-job quota.
--
-- Each plan now carries: a customer-facing description the admin edits from
-- the dashboard, a monthly publish cap, a feature map (which AI services and
-- capabilities the plan includes), and per-service monthly usage limits.
-- Every check runs on the server against this row — interface text can never
-- grant access.

alter table employer_plans
  add column if not exists tier text,                       -- free | professional | enterprise
  add column if not exists description text,
  add column if not exists description_ar text,
  add column if not exists jobs_per_month integer,          -- null = unlimited
  add column if not exists features jsonb not null default '{}'::jsonb,
  add column if not exists ai_limits jsonb not null default '{}'::jsonb;

comment on column employer_plans.features is
  'Feature map: {ai_matching: bool, ai_chatbot: "none"|"limited"|"full", featured_jobs: bool, email_alerts: bool, hr_chatbot: bool}';
comment on column employer_plans.ai_limits is
  'Monthly usage caps per AI service, e.g. {"ai_matching": 100, "hr_chatbot": 300}. Absent = unlimited when the feature is enabled.';

-- Featured jobs (BS-111) — only an Enterprise-plan company may set this, and
-- the server validates the entitlement on every write.
alter table jobs add column if not exists is_featured boolean not null default false;
create index if not exists jobs_featured_active_idx on jobs (is_featured, created_at desc) where is_featured;

-- Monthly AI usage per company per service (BS-107). One row per period.
create table if not exists employer_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  service text not null,
  period_start date not null,
  used integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, service, period_start)
);
create index if not exists employer_ai_usage_user_idx on employer_ai_usage (user_id, period_start desc);
alter table employer_ai_usage enable row level security;
drop policy if exists employer_ai_usage_select_own on employer_ai_usage;
create policy employer_ai_usage_select_own on employer_ai_usage for select using (auth.uid() = user_id);

-- Auditable record of plan configuration changes (BS-107 "retain an auditable
-- record of changes and usage").
create table if not exists employer_plan_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references employer_plans(id) on delete set null,
  actor_id uuid references users(id) on delete set null,
  event_type text not null,            -- plan_created | plan_updated | plan_deleted
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
alter table employer_plan_events enable row level security;
drop policy if exists employer_plan_events_admin on employer_plan_events;
create policy employer_plan_events_admin on employer_plan_events for select
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

-- Seed the three tiers the client specified. Existing rows are matched by
-- price / default flag so ids (and live subscriptions) are preserved.
update employer_plans set
  tier = 'free',
  name = 'Free', name_ar = 'المجانية',
  jobs_per_month = 1,
  features = '{"ai_matching": false, "ai_chatbot": "limited", "hr_chatbot": false, "featured_jobs": false, "email_alerts": false}'::jsonb,
  ai_limits = '{}'::jsonb,
  description = 'One job post per month, unlimited applicants, your company control panel, and immediate support. Suggested candidates are shown blurred — upgrade to unlock them.',
  description_ar = 'وظيفة واحدة شهرياً، متقدمون بلا حدود، لوحة تحكم الشركة، ودعم فوري. المرشحون المقترحون يظهرون مموّهين — رقِّ باقتك لفتحهم.',
  sort_order = 0
where is_default = true and tier is null;

update employer_plans set
  tier = 'professional',
  name = 'Professional', name_ar = 'الاحترافية',
  price = 35000,
  jobs_per_month = 10,
  features = '{"ai_matching": true, "ai_chatbot": "full", "hr_chatbot": true, "featured_jobs": false, "email_alerts": true}'::jsonb,
  ai_limits = '{"ai_matching": 200, "hr_chatbot": 500}'::jsonb,
  description = 'Everything in Free, up to ten job posts per month, the full AI assistant, suggested candidates, and the job-specific HR chatbot.',
  description_ar = 'كل ميزات المجانية، حتى عشر وظائف شهرياً، المساعد الذكي الكامل، المرشحون المقترحون، وشات HR الخاص بكل وظيفة.',
  sort_order = 1
where tier is null and is_default = false and price between 20000 and 40000;

update employer_plans set
  tier = 'enterprise',
  name = 'Enterprise', name_ar = 'المؤسسات',
  price = 50000,
  jobs_per_month = null,
  features = '{"ai_matching": true, "ai_chatbot": "full", "hr_chatbot": true, "featured_jobs": true, "email_alerts": true}'::jsonb,
  ai_limits = '{}'::jsonb,
  description = 'Everything in Professional, unlimited job posts, and the ability to mark jobs as featured so they lead the public listing.',
  description_ar = 'كل ميزات الاحترافية، وظائف بلا حدود، وإمكانية تمييز الوظائف لتتصدّر القائمة العامة.',
  sort_order = 2
where tier is null and is_default = false and price >= 40000;
