-- Private PDF exports: {userId}/cv_{profileId}_{timestamp}.pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-exports',
  'cv-exports',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "cv_exports_user_read" ON storage.objects;
CREATE POLICY "cv_exports_user_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cv-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
