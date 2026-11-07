-- External job feed: the Iraqi Job Pool API returns already-structured jobs
-- (no AI parsing needed). It plugs into the existing job_sources / imported_jobs
-- review pipeline as a new source type 'api'.

ALTER TABLE public.job_sources DROP CONSTRAINT IF EXISTS job_sources_type_check;
ALTER TABLE public.job_sources
  ADD CONSTRAINT job_sources_type_check
  CHECK (type IN ('telegram', 'linkedin', 'rss', 'api'));

-- Seed the Iraqi Job Pool source. config.auto_publish controls whether fetched
-- jobs go live immediately or wait in the admin review queue.
INSERT INTO public.job_sources (type, name, config, is_active)
SELECT 'api', 'Iraqi Job Pool',
  jsonb_build_object(
    'url', 'https://iraqijobpool-production.up.railway.app/api/jobs',
    'review_status', 'ready',
    'auto_publish', true
  ),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_sources WHERE type = 'api' AND name = 'Iraqi Job Pool'
);
