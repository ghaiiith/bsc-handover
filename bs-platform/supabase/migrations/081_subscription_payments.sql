-- 081_subscription_payments.sql
-- Report BS-15 (online checkout): link a payment to the employer subscription it
-- pays for, so the payment webhook can activate the subscription on success.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS employer_subscription_id uuid
  REFERENCES public.employer_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_employer_subscription
  ON public.payments (employer_subscription_id)
  WHERE employer_subscription_id IS NOT NULL;
