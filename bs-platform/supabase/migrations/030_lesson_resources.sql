-- Link course resources to lessons and track where they were added

ALTER TABLE course_resources
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL;

ALTER TABLE course_resources
  ADD COLUMN IF NOT EXISTS added_source text NOT NULL DEFAULT 'studio'
  CHECK (added_source IN ('studio', 'lesson_editor'));

ALTER TABLE course_resources
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_resources_lesson ON course_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_resources_course_lesson ON course_resources(course_id, lesson_id);
