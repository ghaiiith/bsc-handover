-- How external (non-uploaded) resource URLs open for students.
ALTER TABLE course_resources
  ADD COLUMN IF NOT EXISTS url_access_mode text NOT NULL DEFAULT 'download'
  CHECK (url_access_mode IN ('download', 'visit'));
