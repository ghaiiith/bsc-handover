-- One quiz per curriculum lesson (when lesson-linked).
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_quizzes_lesson_unique
  ON course_quizzes(lesson_id)
  WHERE lesson_id IS NOT NULL;
