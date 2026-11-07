-- Storage buckets + policies for course thumbnails and lesson/preview videos.
-- Path pattern: {userId}/{courseId}/{timestamp}.{ext}

-- Thumbnails only. Course lesson/preview videos are stored in Bunny Stream (see SETUP.md).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Legacy bucket (optional). New uploads use Bunny Stream instead of Supabase for videos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-videos',
  'course-videos',
  false,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Thumbnails: instructors upload to their own folder; public read
DROP POLICY IF EXISTS "course_thumbnails_instructor_manage" ON storage.objects;
CREATE POLICY "course_thumbnails_instructor_manage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "course_thumbnails_public_read" ON storage.objects;
CREATE POLICY "course_thumbnails_public_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course-thumbnails');

-- Videos: instructors upload; enrolled students + instructors can read
DROP POLICY IF EXISTS "course_videos_instructor_manage" ON storage.objects;
CREATE POLICY "course_videos_instructor_manage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'course-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "course_videos_read_access" ON storage.objects;
CREATE POLICY "course_videos_read_access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.instructor_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[2]
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id::text = (storage.foldername(name))[2]
    )
    OR get_user_role() = 'admin'
  )
);
