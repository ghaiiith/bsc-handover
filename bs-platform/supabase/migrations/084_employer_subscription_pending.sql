-- 084_employer_subscription_pending.sql
-- Bug fix: createPendingSubscription() inserts status='pending' (a subscription
-- awaiting payment confirmation), but the CHECK from 078 only allowed
-- ('active','expired','cancelled') — so every PAID employer checkout failed at
-- the insert. Allow 'pending' (and 'failed' for abandoned checkouts).

ALTER TABLE public.employer_subscriptions
  DROP CONSTRAINT IF EXISTS employer_subscriptions_status_check;

ALTER TABLE public.employer_subscriptions
  ADD CONSTRAINT employer_subscriptions_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'failed'));
