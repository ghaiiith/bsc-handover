-- Report BS-40: CVs uploaded in bulk from a folder become candidate records.
-- Report BS-39: those records (plus platform users' own CVs) are the pool the
-- employer's job card recommends from.

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /** 'bulk_upload' for imported files, 'platform_user' for a linked account. */
  source text NOT NULL DEFAULT 'bulk_upload',
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  headline text,
  location text,
  skills text[] NOT NULL DEFAULT '{}',
  years_experience integer,
  /** The parsed CV, in the platform's ResumeInput shape. */
  resume jsonb,
  cv_url text,
  cv_file_name text,
  /** sha256 of the uploaded file — the duplicate check for re-imports. */
  file_hash text,
  imported_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One record per person: same email, or the exact same file, updates in place.
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_email
  ON public.candidates (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_file_hash
  ON public.candidates (file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_created ON public.candidates (created_at DESC);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Candidate CVs are personal data: no anon or general authenticated read.
-- Admins read through RLS; everything else goes through the service role after
-- an application-level role check (companies see them only as ranked matches).
DROP POLICY IF EXISTS candidates_admin_all ON public.candidates;
CREATE POLICY candidates_admin_all ON public.candidates
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS candidates_service ON public.candidates;
CREATE POLICY candidates_service ON public.candidates
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS candidates_updated_at ON public.candidates;
CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
