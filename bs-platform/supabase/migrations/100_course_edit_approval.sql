-- Report BS-75: trainer edits to an already-PUBLISHED course are held for admin
-- approval (mirrors the BS-53 job-edit pattern, migration 094). The approved
-- version keeps serving until an admin accepts the change. Scope: course-level
-- scalar fields (title, description, price, thumbnail, level, category, ...);
-- curriculum structure stays live-editable (student lesson_progress FKs to
-- lessons.id make snapshot/replace unsafe).
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pending_changes jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pending_review_status text NOT NULL DEFAULT 'none'
  CHECK (pending_review_status IN ('none', 'pending', 'rejected'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pending_rejection_reason text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pending_submitted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_courses_pending_review
  ON courses(pending_review_status) WHERE pending_review_status = 'pending';
