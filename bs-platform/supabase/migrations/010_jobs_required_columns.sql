-- Run if job save fails (adds columns required by the admin job form)

-- From 005_jobs_indexes.sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- From 008_job_contact_fields.sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_link text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS whatsapp_number text;

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);
