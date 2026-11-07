-- Public portfolio: slug + visibility on users; view analytics table.

ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_is_public boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_portfolio_slug
  ON users (portfolio_slug)
  WHERE portfolio_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS portfolio_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  viewer_ip text,
  viewer_country text
);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_user
  ON portfolio_views (user_id, viewed_at DESC);

ALTER TABLE portfolio_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert view records (public page loads).
CREATE POLICY portfolio_views_insert ON portfolio_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Owners read their own view stats via authenticated session.
CREATE POLICY portfolio_views_select_own ON portfolio_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role full access for analytics queries from API routes.
CREATE POLICY portfolio_views_service ON portfolio_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
