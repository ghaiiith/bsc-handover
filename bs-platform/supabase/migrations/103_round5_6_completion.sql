-- Completion pass for the remaining R5/R6 clauses.

-- ── BS-61: explicit THREE-STATE availability ────────────────────────────────
-- The boolean `availability` stays as the fast filter every query already uses
-- and is kept in sync with the richer state (open_to_work / open_to_offers are
-- both "reachable"; not_looking is not).
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability_status text;
UPDATE users
   SET availability_status = CASE WHEN availability IS FALSE THEN 'not_looking' ELSE 'open_to_work' END
 WHERE availability_status IS NULL;
ALTER TABLE users ALTER COLUMN availability_status SET DEFAULT 'open_to_work';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_availability_status_check;
ALTER TABLE users ADD CONSTRAINT users_availability_status_check
  CHECK (availability_status IS NULL OR availability_status IN ('open_to_work','open_to_offers','not_looking'));

-- ── BS-66: application removal must be a LOGGED administrator action ────────
CREATE TABLE IF NOT EXISTS application_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  job_id uuid,
  applicant_id uuid,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE application_deletion_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS application_deletion_log_admin_read ON application_deletion_log;
CREATE POLICY application_deletion_log_admin_read ON application_deletion_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- BS-66: applicants may no longer hard-delete their own applications (the
-- employer's record must survive); the old policy granted FOR ALL.
DROP POLICY IF EXISTS job_apps_applicant_manage_own ON job_applications;
CREATE POLICY job_apps_applicant_read_own ON job_applications
  FOR SELECT USING (applicant_id = auth.uid());
CREATE POLICY job_apps_applicant_insert_own ON job_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- ── BS-63: contact outcomes must be readable per candidate for ranking ─────
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_outcome
  ON job_applications(applicant_id, contact_outcome)
  WHERE contact_outcome IS NOT NULL;
