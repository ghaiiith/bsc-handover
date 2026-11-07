-- Phase 6: Platform settings and admin enhancements

CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO platform_settings (key, value) VALUES
  ('commission_rate', '20'),
  ('maintenance_mode', 'false'),
  ('support_email', 'support@bs-platform.com'),
  ('platform_name', 'Business Skills'),
  ('featured_course_ids', '[]')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS rejection_note text;
-- Keep rejection_reason from Phase 2; rejection_note alias for spec compatibility
UPDATE courses SET rejection_note = rejection_reason WHERE rejection_note IS NULL AND rejection_reason IS NOT NULL;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_admin_all" ON platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "settings_public_read_maintenance" ON platform_settings
  FOR SELECT USING (key IN ('maintenance_mode', 'platform_name'));

-- Admin notifications: admins can read their own
CREATE POLICY "notifications_admin_read" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_instructor_requests_status ON instructor_requests(status);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);
