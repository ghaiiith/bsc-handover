-- Report BS-62/79: jobs ingested by the external feed AFTER migration 097 were
-- never flagged (fetch-external-jobs.ts omitted is_external), so they kept
-- showing the in-platform Apply box and applications sent through them were
-- silently lost. Re-run the backfill by the definitive link: any job published
-- by the import pipeline is externally sourced.
UPDATE jobs j
   SET is_external = true
  FROM imported_jobs ij
 WHERE ij.published_job_id = j.id
   AND j.is_external = false;
