-- Community (Talent Directory) performance index and settings.

CREATE INDEX IF NOT EXISTS idx_users_community
  ON users (is_active, portfolio_is_public, portfolio_slug)
  WHERE is_active = true
    AND portfolio_is_public = true
    AND portfolio_slug IS NOT NULL;

INSERT INTO platform_settings (key, value) VALUES
  ('community_featured_users', '[]'),
  ('community_visible', 'true')
ON CONFLICT (key) DO NOTHING;
