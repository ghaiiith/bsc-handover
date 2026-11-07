-- Service portfolio images bucket (used by seller + admin service forms)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-portfolio',
  'service-portfolio',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "service_portfolio_owner_manage" ON storage.objects;
CREATE POLICY "service_portfolio_owner_manage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'service-portfolio'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'service-portfolio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "service_portfolio_public_read" ON storage.objects;
CREATE POLICY "service_portfolio_public_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'service-portfolio');

-- Allow admins to manage portfolio files for any service they own (seller_id = admin)
DROP POLICY IF EXISTS "service_portfolio_admin_manage" ON storage.objects;
CREATE POLICY "service_portfolio_admin_manage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'service-portfolio'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'service-portfolio'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
