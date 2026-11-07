-- Allow enrollment counts on published courses (public listing) and instructor dashboards.

CREATE POLICY "enrollments_public_read_published_courses" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
        AND courses.status = 'published'
    )
  );

CREATE POLICY "enrollments_instructor_read_own_courses" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );
