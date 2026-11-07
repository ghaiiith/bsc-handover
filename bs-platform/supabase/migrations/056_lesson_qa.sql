-- Private lesson Q&A: one thread per (lesson, student); messages visible only to that student and the course instructor.

CREATE TABLE IF NOT EXISTS lesson_qa_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

CREATE TABLE IF NOT EXISTS lesson_qa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES lesson_qa_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('student', 'instructor')),
  content text NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_qa_threads_course ON lesson_qa_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_qa_threads_lesson ON lesson_qa_threads(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_qa_threads_student ON lesson_qa_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_qa_threads_instructor ON lesson_qa_threads(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lesson_qa_threads_last_message ON lesson_qa_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_qa_messages_thread ON lesson_qa_messages(thread_id, created_at);

ALTER TABLE lesson_qa_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_qa_messages ENABLE ROW LEVEL SECURITY;

-- Students: own threads only
CREATE POLICY lesson_qa_threads_student_select ON lesson_qa_threads
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY lesson_qa_threads_student_insert ON lesson_qa_threads
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.course_id = lesson_qa_threads.course_id AND e.student_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM lessons l
        WHERE l.id = lesson_qa_threads.lesson_id
          AND l.course_id = lesson_qa_threads.course_id
          AND l.is_free_preview = true
      )
    )
  );

-- Instructors: threads for their courses
CREATE POLICY lesson_qa_threads_instructor_select ON lesson_qa_threads
  FOR SELECT USING (instructor_id = auth.uid());

CREATE POLICY lesson_qa_threads_instructor_update ON lesson_qa_threads
  FOR UPDATE USING (instructor_id = auth.uid());

-- Messages: readable if user owns thread (student) or teaches course (instructor)
CREATE POLICY lesson_qa_messages_select ON lesson_qa_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_qa_threads t
      WHERE t.id = lesson_qa_messages.thread_id
        AND (t.student_id = auth.uid() OR t.instructor_id = auth.uid())
    )
  );

CREATE POLICY lesson_qa_messages_student_insert ON lesson_qa_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'student'
    AND EXISTS (
      SELECT 1 FROM lesson_qa_threads t
      WHERE t.id = lesson_qa_messages.thread_id AND t.student_id = auth.uid()
    )
  );

CREATE POLICY lesson_qa_messages_instructor_insert ON lesson_qa_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'instructor'
    AND EXISTS (
      SELECT 1 FROM lesson_qa_threads t
      WHERE t.id = lesson_qa_messages.thread_id AND t.instructor_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY lesson_qa_threads_admin_all ON lesson_qa_threads
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY lesson_qa_messages_admin_all ON lesson_qa_messages
  FOR ALL USING (get_user_role() = 'admin');
