-- 068_saved_jobs.sql
-- Let users save/bookmark jobs (mirrors course_wishlists).

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON public.saved_jobs (user_id, created_at DESC);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Owner manages their own saved jobs. (Table DML is granted to authenticated via
-- the default privileges set in migration 065.)
DROP POLICY IF EXISTS saved_jobs_owner_all ON public.saved_jobs;
CREATE POLICY saved_jobs_owner_all ON public.saved_jobs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
