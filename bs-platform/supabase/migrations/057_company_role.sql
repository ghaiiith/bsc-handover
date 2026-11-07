-- Company representative role: affiliation requests, job posting, portfolio viewing.

-- Extend users.role to include company
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'instructor', 'admin', 'company'));

-- Company affiliation requests (mirrors instructor_requests)
CREATE TABLE IF NOT EXISTS company_affiliation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_name_ar text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_affiliation_requests_user ON company_affiliation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_company_affiliation_requests_status ON company_affiliation_requests(status);

-- Jobs: who posted (company rep or admin)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_by uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);

ALTER TABLE company_affiliation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_affiliation_requests_own_read ON company_affiliation_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY company_affiliation_requests_own_insert ON company_affiliation_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY company_affiliation_requests_admin_all ON company_affiliation_requests
  FOR ALL USING (get_user_role() = 'admin');

-- Company reps manage their own job posts
CREATE POLICY jobs_company_rep_all ON jobs
  FOR ALL USING (
    get_user_role() = 'company'
    AND posted_by = auth.uid()
  );
