-- Change Request round 5 (BS-61..BS-70): jobs availability, external-job marker,
-- application status lifecycle + contact outcome, expected salary, academy tiers.

-- ── BS-61: open-to-work availability ────────────────────────────────────────
-- `users.availability` already exists (018) defaulting to false. On a jobs
-- platform, active job-seekers should be visible by default; make the default
-- true and backfill existing seekers so the candidate pool isn't emptied. The
-- profile switch lets anyone opt out, and BS-63/BS-64 flip it back to false when
-- a candidate is hired / says they are no longer looking.
ALTER TABLE users ALTER COLUMN availability SET DEFAULT true;
UPDATE users
  SET availability = true
  WHERE availability IS DISTINCT FROM true
    AND role IN ('student', 'freelancer');

-- ── BS-62: mark externally-sourced (Telegram/API) jobs ──────────────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

-- Backfill: any published job linked from the import pipeline is external.
UPDATE jobs j
  SET is_external = true
  FROM imported_jobs ij
  WHERE ij.published_job_id = j.id
    AND j.is_external = false;

CREATE INDEX IF NOT EXISTS idx_jobs_is_external ON jobs(is_external);

-- ── BS-63 / BS-66: application lifecycle + contact outcome ───────────────────
-- Widen the status set with 'contacted' and 'archived' (applications are managed
-- by status, never deleted).
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status = ANY (ARRAY[
    'pending','submitted','reviewed','shortlisted','contacted','accepted','rejected','archived'
  ]));

-- Outcome the employer records after contacting a candidate (BS-63).
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS contact_outcome text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS contact_note text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_contact_outcome_check;
ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_contact_outcome_check
  CHECK (contact_outcome IS NULL OR contact_outcome = ANY (ARRAY[
    'available_interested','available_not_interested','employed_elsewhere',
    'salary_too_high','no_answer','wrong_number','contact_later'
  ]));

-- ── BS-65: optional expected salary on the student profile ───────────────────
-- Optional, never required, and deliberately NOT part of profile completion.
ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_salary_amount integer;
ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_salary_currency text DEFAULT 'IQD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_salary_period text DEFAULT 'monthly';
ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_salary_public boolean DEFAULT true;
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_expected_salary_period_check;
ALTER TABLE users
  ADD CONSTRAINT users_expected_salary_period_check
  CHECK (expected_salary_period IS NULL OR expected_salary_period = ANY (ARRAY['monthly','yearly']));

-- ── BS-64: monthly job-status ping bookkeeping ──────────────────────────────
-- Remember when a seeker was last asked "did you find a job?" so the cron only
-- pings once a month and stops asking anyone who opted out.
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_status_last_asked_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_status_ask_enabled boolean DEFAULT true;

-- ── BS-70: admin-configurable Company Academy seat tiers ────────────────────
-- Stored in platform_settings as JSON: [{minSeats, discountPct}] applied to the
-- per-seat course price for bulk company purchases.
INSERT INTO platform_settings (key, value)
  VALUES ('academy_seat_tiers', '[{"minSeats":5,"discountPct":10},{"minSeats":10,"discountPct":15},{"minSeats":20,"discountPct":20},{"minSeats":50,"discountPct":30}]')
  ON CONFLICT (key) DO NOTHING;
