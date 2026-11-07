-- 066_job_applications_apply_flow.sql
-- Wire up in-platform job applications (the table existed since 001 but had no
-- app code and no way for the job poster to see applicants).

-- One application per applicant per job.
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_unique_applicant;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_unique_applicant UNIQUE (job_id, applicant_id);

-- Widen the status set to support the application lifecycle, then default new
-- rows to 'submitted'. (The original 001 constraint only allowed
-- pending/reviewed/accepted/rejected.)
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status = ANY (ARRAY['pending','submitted','reviewed','shortlisted','accepted','rejected']));
ALTER TABLE public.job_applications
  ALTER COLUMN status SET DEFAULT 'submitted';

-- Let the job poster (company/admin who owns the job) read applications for
-- their own jobs. Applicant + admin policies already exist.
DROP POLICY IF EXISTS job_apps_poster_read ON public.job_applications;
CREATE POLICY job_apps_poster_read ON public.job_applications
  FOR SELECT
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE posted_by = auth.uid())
  );

-- Poster may update application status (e.g. reviewed / shortlisted / rejected).
DROP POLICY IF EXISTS job_apps_poster_update ON public.job_applications;
CREATE POLICY job_apps_poster_update ON public.job_applications
  FOR UPDATE
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE posted_by = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_job_applications_applicant
  ON public.job_applications (applicant_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job
  ON public.job_applications (job_id, applied_at DESC);
