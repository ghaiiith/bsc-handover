-- Lesson watch position + bookmarks for enterprise player resume/bookmark features

ALTER TABLE lesson_progress
  ADD COLUMN IF NOT EXISTS watch_position_seconds numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_watched_at timestamptz,
  ADD COLUMN IF NOT EXISTS device_info jsonb;

CREATE TABLE IF NOT EXISTS lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  timestamp_seconds numeric NOT NULL CHECK (timestamp_seconds >= 0),
  title text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, lesson_id, timestamp_seconds)
);

CREATE INDEX IF NOT EXISTS idx_lesson_bookmarks_student_lesson
  ON lesson_bookmarks(student_id, lesson_id);

ALTER TABLE lesson_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_student_manage_own" ON lesson_bookmarks
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
