-- Per-course and per-lesson upload provider overrides (nullable — falls back to global default)

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS video_upload_provider text
    CHECK (video_upload_provider IS NULL OR video_upload_provider IN ('vimeo', 'r2'));

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS video_upload_provider text
    CHECK (video_upload_provider IS NULL OR video_upload_provider IN ('vimeo', 'r2'));

CREATE INDEX IF NOT EXISTS idx_courses_video_upload_provider ON courses(video_upload_provider);
CREATE INDEX IF NOT EXISTS idx_lessons_video_upload_provider ON lessons(video_upload_provider);
