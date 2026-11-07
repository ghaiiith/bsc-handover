-- Report BS-38: the admin can grant free subscription months, platform-wide or
-- to one company. Billing returns to the normal price when the grant runs out —
-- the grant is consumed once, so the next subscribe goes through the gateway.

-- NULL = use the platform-wide setting (platform_settings.free_subscription_months).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_subscription_months integer
  CHECK (free_subscription_months IS NULL OR free_subscription_months >= 0);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_subscription_months_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.employer_subscriptions
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

ALTER TABLE public.employer_subscriptions
  ADD COLUMN IF NOT EXISTS free_months integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.free_subscription_months IS
  'Report BS-38: per-company free months. NULL falls back to platform_settings.free_subscription_months.';
COMMENT ON COLUMN public.employer_subscriptions.is_free IS
  'Report BS-38: activated from a free-months grant rather than a payment.';

-- Expiring a lapsed subscription keeps the company view honest; the job quota
-- already falls back to the default plan once current_period_end passes.
CREATE INDEX IF NOT EXISTS idx_employer_subs_period_end
  ON public.employer_subscriptions (status, current_period_end);
