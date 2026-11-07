-- 076_service_approval.sql
-- Report BS-20: services must be approved by an admin before they go public.
--
-- New/edited services enter 'pending' review (hidden from the public marketplace
-- because the public-read RLS only exposes status='active'); an admin approves
-- (-> 'active') or rejects (-> 'rejected' with a reason). Existing live services
-- stay 'active'.

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN ('active', 'paused', 'deleted', 'pending', 'rejected'));

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Public-read RLS already scopes to status='active', so 'pending'/'rejected' are
-- automatically hidden — no policy change required.
