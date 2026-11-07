-- course_sections had RLS enabled in 002_rls.sql but no policies — blocks all section CRUD.

DROP POLICY IF EXISTS "sections_public_read_published" ON course_sections;
CREATE POLICY "sections_public_read_published" ON course_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_sections.course_id
        AND courses.status = 'published'
    )
  );

DROP POLICY IF EXISTS "sections_instructor_manage" ON course_sections;
CREATE POLICY "sections_instructor_manage" ON course_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_sections.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sections_admin_all" ON course_sections;
CREATE POLICY "sections_admin_all" ON course_sections
  FOR ALL USING (get_user_role() = 'admin');
