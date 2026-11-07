-- Growth-guide landing page (lead magnet): captures the visitor's details in
-- exchange for the free assessment guide, so the owner can follow up.
CREATE TABLE IF NOT EXISTS landing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  job_title text,
  whatsapp text NOT NULL,
  email text NOT NULL,
  company_size text CHECK (company_size IS NULL OR company_size IN ('1-5', '6-20', '20+')),
  source text NOT NULL DEFAULT 'growth_guide',
  locale text NOT NULL DEFAULT 'ar',
  downloaded_at timestamptz,
  booked_call_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_leads_created ON landing_leads(created_at DESC);
-- One row per email per campaign; a repeat download just refreshes the record.
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_leads_email_source
  ON landing_leads(lower(email), source);

ALTER TABLE landing_leads ENABLE ROW LEVEL SECURITY;
-- Anonymous visitors submit through a server action (service role); only admins read.
DROP POLICY IF EXISTS landing_leads_admin_read ON landing_leads;
CREATE POLICY landing_leads_admin_read ON landing_leads
  FOR SELECT USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Admin-editable destinations for the campaign (no developer needed to change them).
INSERT INTO platform_settings (key, value) VALUES
  ('growth_guide_pdf_url', ''),
  ('growth_guide_booking_url', ''),
  ('growth_guide_author_photo', '')
ON CONFLICT (key) DO NOTHING;
