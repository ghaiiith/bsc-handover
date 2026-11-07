-- 077_cv_upload.sql
-- Report BS-13: let students upload their own CV (PDF) and attach it to job
-- applications, alongside the built-in CV builder.

-- 1) Store a reference to the user's uploaded CV on their profile.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS uploaded_cv_url text,
  ADD COLUMN IF NOT EXISTS uploaded_cv_name text;

-- Own-profile reads go through the SECURITY DEFINER get_my_profile() function,
-- so no extra column grant is needed for the owner. These columns are not
-- cross-user readable (an employer sees the attached CV via job_applications.cv_url).

-- 2) Public bucket for uploaded CVs (unguessable per-user path). Public so the
--    URL stored on a job application is viewable by the employer, mirroring how
--    avatars / service portfolio images are served.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-uploads',
  'cv-uploads',
  true,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "cv_uploads_public_read" ON storage.objects;
CREATE POLICY "cv_uploads_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'cv-uploads');

DROP POLICY IF EXISTS "cv_uploads_owner_write" ON storage.objects;
CREATE POLICY "cv_uploads_owner_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cv-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "cv_uploads_owner_update" ON storage.objects;
CREATE POLICY "cv_uploads_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cv-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
