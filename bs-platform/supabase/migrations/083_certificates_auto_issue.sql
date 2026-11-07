-- 083_certificates_auto_issue.sql
-- Report BS-29: completing a course never issued a certificate.
--
-- Root cause: `courses.certificate_enabled` was added in 017 with DEFAULT false,
-- so recordCourseCompletionIfEligible() always returned early before issuing.
-- Certificates are a headline platform promise, so they are now ON by default;
-- an instructor can still switch a specific course off in the studio.

ALTER TABLE public.courses ALTER COLUMN certificate_enabled SET DEFAULT true;

-- Turn it on for every existing course (false was never a deliberate choice).
UPDATE public.courses
   SET certificate_enabled = true
 WHERE certificate_enabled IS DISTINCT FROM true;

-- Admins should be able to read/manage certificates (only student + instructor
-- SELECT policies existed; writes stay service-role only).
DROP POLICY IF EXISTS "certificates_select_admin" ON public.certificates;
CREATE POLICY "certificates_select_admin" ON public.certificates
  FOR SELECT USING (public.get_user_role() = 'admin');
