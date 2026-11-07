-- Admin-published services: contact info + admin tracking
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_link text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES users(id);

DROP POLICY IF EXISTS "services_admin_all" ON services;
CREATE POLICY "services_admin_all" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
