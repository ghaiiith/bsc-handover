-- Automated job scraping: sources + imported job queue

CREATE TABLE IF NOT EXISTS job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('telegram', 'linkedin', 'rss')),
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_checked_at timestamptz,
  total_imported int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imported_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES job_sources(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  raw_content text NOT NULL,
  source_url text,
  source_post_id text,
  ai_processed boolean DEFAULT false,
  ai_result jsonb,
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'reviewed', 'published', 'rejected', 'duplicate')
  ),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_imported_jobs_status ON imported_jobs(status);
CREATE INDEX IF NOT EXISTS idx_imported_jobs_source ON imported_jobs(source_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_imported_jobs_dedup
  ON imported_jobs(source_type, source_post_id)
  WHERE source_post_id IS NOT NULL;

ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_jobs ENABLE ROW LEVEL SECURITY;

-- Service role only (admin API routes use createAdminClient)
CREATE POLICY job_sources_service ON job_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY imported_jobs_service ON imported_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins via authenticated role check in app layer; allow admin read/write
CREATE POLICY job_sources_admin ON job_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY imported_jobs_admin ON imported_jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
