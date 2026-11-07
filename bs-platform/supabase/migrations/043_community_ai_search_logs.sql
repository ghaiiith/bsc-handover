-- Track community AI talent searches for admin analytics (30-day counts).

CREATE TABLE IF NOT EXISTS community_ai_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_ai_search_logs_created_at
  ON community_ai_search_logs (created_at DESC);

ALTER TABLE community_ai_search_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE community_ai_search_logs FROM anon, authenticated;
