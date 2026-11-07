-- Admin course management: allow admins to fully manage any course's content
-- (curriculum, lessons, resources, assignments, quizzes, discussions), enabling
-- joint admin + instructor management.
--
-- `courses` and `course_sections` already have admin policies (002/013). Course
-- video storage already allows admins (014). These tables were instructor-only.

-- Lessons
DROP POLICY IF EXISTS "lessons_admin_all" ON lessons;
CREATE POLICY "lessons_admin_all" ON lessons
  FOR ALL USING (get_user_role() = 'admin');

-- Course resources
DROP POLICY IF EXISTS "course_resources_admin_all" ON course_resources;
CREATE POLICY "course_resources_admin_all" ON course_resources
  FOR ALL USING (get_user_role() = 'admin');

-- Assignments
DROP POLICY IF EXISTS "course_assignments_admin_all" ON course_assignments;
CREATE POLICY "course_assignments_admin_all" ON course_assignments
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "assignment_submissions_admin_all" ON assignment_submissions;
CREATE POLICY "assignment_submissions_admin_all" ON assignment_submissions
  FOR ALL USING (get_user_role() = 'admin');

-- Quizzes
DROP POLICY IF EXISTS "course_quizzes_admin_all" ON course_quizzes;
CREATE POLICY "course_quizzes_admin_all" ON course_quizzes
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "quiz_questions_admin_all" ON quiz_questions;
CREATE POLICY "quiz_questions_admin_all" ON quiz_questions
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "quiz_attempts_admin_all" ON quiz_attempts;
CREATE POLICY "quiz_attempts_admin_all" ON quiz_attempts
  FOR ALL USING (get_user_role() = 'admin');

-- Lesson discussions
DROP POLICY IF EXISTS "lesson_discussions_admin_all" ON lesson_discussions;
CREATE POLICY "lesson_discussions_admin_all" ON lesson_discussions
  FOR ALL USING (get_user_role() = 'admin');
