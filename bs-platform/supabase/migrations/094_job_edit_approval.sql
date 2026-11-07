-- Report BS-53: edits to an already-published job must be admin-approved, and
-- the previously approved version stays live until then. We hold the edit as
-- `pending_changes` on the row rather than mutating the live fields, so the
-- public listing keeps serving the approved version.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pending_changes jsonb;
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pending_review_status text NOT NULL DEFAULT 'none'
  CHECK (pending_review_status IN ('none', 'pending', 'rejected'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pending_rejection_reason text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pending_submitted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_jobs_pending_review
  ON public.jobs (pending_review_status)
  WHERE pending_review_status = 'pending';

COMMENT ON COLUMN public.jobs.pending_changes IS
  'Report BS-53: a company edit to a live job awaiting admin approval. The live '
  'columns keep the approved version until an admin applies these.';
