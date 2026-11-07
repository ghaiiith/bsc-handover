-- 078_employer_plans.sql
-- Report BS-15: employer job posting is governed by a subscription plan that caps
-- the number of active job posts. Plans are fully admin-editable (name, quota,
-- price, duration) from the Admin Dashboard — no code change required.

-- Admin-editable plans.
CREATE TABLE IF NOT EXISTS public.employer_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  job_quota integer NOT NULL DEFAULT 1 CHECK (job_quota >= 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'IQD',
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A company's active subscription to a plan.
CREATE TABLE IF NOT EXISTS public.employer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.employer_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employer_subs_user ON public.employer_subscriptions (user_id, status);

ALTER TABLE public.employer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans: anyone may read active plans (pricing page); admin manages all.
DROP POLICY IF EXISTS "employer_plans_public_read" ON public.employer_plans;
CREATE POLICY "employer_plans_public_read" ON public.employer_plans
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "employer_plans_admin_all" ON public.employer_plans;
CREATE POLICY "employer_plans_admin_all" ON public.employer_plans
  FOR ALL USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Subscriptions: owner reads own; admin manages all. Writes go through the
-- service-role client in application code.
DROP POLICY IF EXISTS "employer_subs_owner_read" ON public.employer_subscriptions;
CREATE POLICY "employer_subs_owner_read" ON public.employer_subscriptions
  FOR SELECT USING (user_id = auth.uid() OR public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "employer_subs_admin_all" ON public.employer_subscriptions;
CREATE POLICY "employer_subs_admin_all" ON public.employer_subscriptions
  FOR ALL USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Seed a default free plan so existing companies keep a baseline quota.
INSERT INTO public.employer_plans (name, name_ar, job_quota, price, duration_days, is_default, sort_order)
SELECT 'Starter', 'المبتدئ', 3, 0, 30, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.employer_plans WHERE is_default = true);
