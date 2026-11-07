-- Freelancer role requests (mirrors instructor_requests / company_affiliation_requests)

CREATE TABLE IF NOT EXISTS freelancer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freelancer_requests_user ON freelancer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_requests_status ON freelancer_requests(status);

ALTER TABLE freelancer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY freelancer_requests_own_read ON freelancer_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY freelancer_requests_own_insert ON freelancer_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY freelancer_requests_admin_all ON freelancer_requests
  FOR ALL USING (get_user_role() = 'admin');
