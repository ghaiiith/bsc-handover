-- Course certifications, final exams, and certificate verification

ALTER TABLE courses ADD COLUMN IF NOT EXISTS final_exam_required boolean DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS final_exam_pdf_path text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS final_exam_pdf_name text;

CREATE TABLE IF NOT EXISTS course_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percent int NOT NULL DEFAULT 100,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_completions_student ON course_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_course ON course_completions(course_id);

CREATE TABLE IF NOT EXISTS final_exam_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_pdf_path text NOT NULL,
  answer_pdf_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  instructor_feedback text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_course_status
  ON final_exam_submissions(course_id, status);

CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_code text NOT NULL UNIQUE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_name_ar text,
  course_title text NOT NULL,
  course_title_ar text NOT NULL,
  instructor_name text NOT NULL,
  instructor_name_ar text,
  issued_via text NOT NULL CHECK (issued_via IN ('auto_completion', 'exam_approved')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(verification_code);

-- RLS: course_completions
ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_completions_select_own ON course_completions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY course_completions_select_instructor ON course_completions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_completions.course_id
        AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY course_completions_insert_own ON course_completions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- RLS: final_exam_submissions
ALTER TABLE final_exam_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY final_exam_submissions_select_own ON final_exam_submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY final_exam_submissions_select_instructor ON final_exam_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = final_exam_submissions.course_id
        AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY final_exam_submissions_insert_own ON final_exam_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY final_exam_submissions_update_own ON final_exam_submissions
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status IN ('rejected'))
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

CREATE POLICY final_exam_submissions_update_instructor ON final_exam_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = final_exam_submissions.course_id
        AND c.instructor_id = auth.uid()
    )
  );

-- RLS: certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY certificates_select_own ON certificates
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY certificates_select_instructor ON certificates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = certificates.course_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Storage: instructor exam materials (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'final-exam-materials',
  'final-exam-materials',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage: student exam answers (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'final-exam-submissions',
  'final-exam-submissions',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Instructor uploads exam PDF: {instructorId}/{courseId}/exam.pdf
CREATE POLICY final_exam_materials_instructor_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'final-exam-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY final_exam_materials_instructor_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'final-exam-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY final_exam_materials_instructor_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'final-exam-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY final_exam_materials_instructor_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'final-exam-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY final_exam_materials_student_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'final-exam-materials'
    AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[2]
    )
  );

-- Student uploads answer: {studentId}/{courseId}/{timestamp}.pdf
CREATE POLICY final_exam_submissions_student_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'final-exam-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY final_exam_submissions_student_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'final-exam-submissions'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND c.instructor_id = auth.uid()
      )
    )
  );
