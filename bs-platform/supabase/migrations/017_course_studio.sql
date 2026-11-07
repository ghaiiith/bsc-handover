-- Course Studio: extended fields, lesson types, resources, assignments, quizzes, discussions

-- Extend courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subtitle_ar text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'draft'
  CHECK (visibility IN ('draft', 'private', 'published', 'archived'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS access_type text DEFAULT 'lifetime'
  CHECK (access_type IN ('lifetime', 'subscription'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS discount_price numeric;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_enabled boolean DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_template text DEFAULT 'default';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_min_progress int DEFAULT 100;

-- Extend lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_type text DEFAULT 'video'
  CHECK (lesson_type IN ('video', 'pdf', 'article', 'download', 'external', 'live', 'quiz', 'assignment'));
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_html text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_mandatory boolean DEFAULT true;

-- Extend reviews with instructor reply
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS instructor_reply text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS instructor_reply_at timestamptz;

-- Course resources library
CREATE TABLE IF NOT EXISTS course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'document',
  category text NOT NULL DEFAULT 'documents'
    CHECK (category IN ('documents', 'source_code', 'design_assets', 'templates', 'datasets')),
  folder text DEFAULT 'general',
  file_size_bytes bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_resources_course ON course_resources(course_id);

-- Assignments
CREATE TABLE IF NOT EXISTS course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  instructions text,
  due_date timestamptz,
  points int DEFAULT 100,
  submission_types text[] DEFAULT ARRAY['file', 'text'],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_type text NOT NULL DEFAULT 'file',
  content text,
  file_url text,
  status text DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'graded', 'returned')),
  grade numeric,
  feedback text,
  submitted_at timestamptz DEFAULT now(),
  graded_at timestamptz,
  UNIQUE(assignment_id, student_id)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS course_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  title_ar text,
  passing_score int DEFAULT 70,
  max_attempts int DEFAULT 3,
  time_limit_minutes int,
  randomize_questions boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice', 'multi_select', 'true_false', 'short_answer')),
  question_text text NOT NULL,
  question_text_ar text,
  options jsonb DEFAULT '[]'::jsonb,
  correct_answer jsonb,
  points int DEFAULT 1,
  order_index int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score numeric,
  passed boolean DEFAULT false,
  answers jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Lesson discussions
CREATE TABLE IF NOT EXISTS lesson_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES lesson_discussions(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_solution boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson ON lesson_discussions(lesson_id);

-- RLS
ALTER TABLE course_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussions ENABLE ROW LEVEL SECURITY;

-- Instructors manage own course resources
CREATE POLICY course_resources_instructor_all ON course_resources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY course_resources_enrolled_read ON course_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = course_resources.course_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY course_assignments_instructor_all ON course_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY course_assignments_enrolled_read ON course_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = course_assignments.course_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY assignment_submissions_student_insert ON assignment_submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY assignment_submissions_student_read ON assignment_submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY assignment_submissions_instructor_all ON assignment_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY course_quizzes_instructor_all ON course_quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY course_quizzes_enrolled_read ON course_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = course_quizzes.course_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY quiz_questions_instructor_all ON quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY quiz_questions_enrolled_read ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_quizzes q
      JOIN enrollments e ON e.course_id = q.course_id
      WHERE q.id = quiz_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY quiz_attempts_student_all ON quiz_attempts
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY quiz_attempts_instructor_read ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY lesson_discussions_read ON lesson_discussions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = lesson_discussions.course_id AND e.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lesson_discussions.course_id AND c.instructor_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY lesson_discussions_insert ON lesson_discussions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY lesson_discussions_instructor_update ON lesson_discussions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lesson_discussions.course_id AND c.instructor_id = auth.uid()
    )
  );
