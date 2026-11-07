-- Virtual payments, course wishlists, course documents storage.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('zaincash', 'qicard', 'virtual'));

CREATE TABLE IF NOT EXISTS course_wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_wishlists_user ON course_wishlists(user_id, created_at DESC);

ALTER TABLE course_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_wishlists_select_own ON course_wishlists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY course_wishlists_insert_own ON course_wishlists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY course_wishlists_delete_own ON course_wishlists
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-documents', 'course-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY course_documents_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'course-documents');

CREATE POLICY course_documents_instructor_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY course_documents_instructor_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY course_documents_instructor_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
