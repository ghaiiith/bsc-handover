-- Phase 1: Cloudflare R2 video infrastructure
-- Introduces a provider-agnostic `video_assets` table that stores generic
-- storage metadata (provider, bucket, object key, size, duration, status).
-- Lessons and course preview videos now reference a video_asset instead of
-- embedding a provider-specific ref string. Bunny is fully removed.

CREATE TABLE IF NOT EXISTS video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider text NOT NULL DEFAULT 'r2',
  bucket_name text NOT NULL,
  object_key text NOT NULL,
  mime_type text,
  file_size bigint,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'ready', 'failed')),
  original_filename text,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  uploaded_at timestamptz,
  UNIQUE (bucket_name, object_key)
);

CREATE INDEX IF NOT EXISTS idx_video_assets_course ON video_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON video_assets(status);

-- Reference columns (nullable; legacy text columns are kept but no longer used).
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS video_asset_id uuid REFERENCES video_assets(id) ON DELETE SET NULL;
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS preview_video_asset_id uuid REFERENCES video_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_video_asset ON lessons(video_asset_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Signed URLs and metadata writes go through the server (service-role client)
-- which bypasses RLS after performing its own authorization. These policies
-- are defense-in-depth for any direct access.
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_assets_admin_all" ON video_assets;
CREATE POLICY "video_assets_admin_all" ON video_assets
  FOR ALL USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "video_assets_instructor_own" ON video_assets;
CREATE POLICY "video_assets_instructor_own" ON video_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = video_assets.course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = video_assets.course_id AND c.instructor_id = auth.uid()
    )
  );
