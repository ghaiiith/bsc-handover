-- 075_job_expiry.sql
-- Report BS-16: cap a job listing's lifetime at 30 days with a renewal option.
--
-- `expires_at` is set to now()+30d when a job is published; a cron flips expired
-- 'active' jobs to the new 'expired' status (de-listed), and the employer can
-- renew to restart the 30-day window.

-- 1) Lifetime column
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2) Allow an 'expired' status (in addition to active/closed/draft)
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('active', 'closed', 'draft', 'expired'));

-- 3) Give existing active jobs a fresh 30-day window (so nothing de-lists abruptly)
UPDATE public.jobs
  SET expires_at = now() + interval '30 days'
  WHERE status = 'active' AND expires_at IS NULL;

-- 4) Public listing must also hide expired-but-not-yet-swept jobs.
DROP POLICY IF EXISTS "jobs_public_read_active" ON public.jobs;
CREATE POLICY "jobs_public_read_active" ON public.jobs
  FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

CREATE INDEX IF NOT EXISTS idx_jobs_expires_at
  ON public.jobs (expires_at)
  WHERE status = 'active';
