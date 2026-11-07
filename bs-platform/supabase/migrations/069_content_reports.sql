-- 069_content_reports.sql
-- User-facing content reporting + admin moderation queue.

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['course','service','job','user','review','community'])),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason = ANY (ARRAY['spam','inappropriate','misleading','scam','harassment','copyright','other'])),
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open','reviewing','resolved','dismissed'])),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports (target_type, target_id);
-- One open report per user per target (avoid duplicate spam).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_report_per_user
  ON public.content_reports (reporter_id, target_type, target_id)
  WHERE status = 'open';

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reporter can create + read their own reports.
DROP POLICY IF EXISTS content_reports_reporter_insert ON public.content_reports;
CREATE POLICY content_reports_reporter_insert ON public.content_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS content_reports_reporter_read ON public.content_reports;
CREATE POLICY content_reports_reporter_read ON public.content_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Admin reads + manages all reports.
DROP POLICY IF EXISTS content_reports_admin_all ON public.content_reports;
CREATE POLICY content_reports_admin_all ON public.content_reports
  FOR ALL USING (public.get_user_role() = 'admin');
