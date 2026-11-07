-- Report BS-35: portfolio pages rendered from uploaded HTML templates.
-- Admins upload the HTML, users pick which template their public portfolio uses.

CREATE TABLE IF NOT EXISTS portfolio_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  description text,
  html text NOT NULL,
  preview_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_templates_active
  ON portfolio_templates (is_active, sort_order);

ALTER TABLE portfolio_templates ENABLE ROW LEVEL SECURITY;

-- Everyone may list the active templates (needed by the picker and the public page).
DROP POLICY IF EXISTS portfolio_templates_select_active ON portfolio_templates;
CREATE POLICY portfolio_templates_select_active ON portfolio_templates
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Writes go through the service role only (admin actions verify the role first).
DROP POLICY IF EXISTS portfolio_templates_service ON portfolio_templates;
CREATE POLICY portfolio_templates_service ON portfolio_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Which template the user picked; NULL keeps the built-in design.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS portfolio_template_id uuid
  REFERENCES portfolio_templates(id) ON DELETE SET NULL;
