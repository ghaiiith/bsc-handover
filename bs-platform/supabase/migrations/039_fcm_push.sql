-- FCM device tokens for web/mobile push notifications.
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_label text,
  locale text DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fcm_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON public.fcm_tokens(last_used_at);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcm_tokens_read_own" ON public.fcm_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "fcm_tokens_insert_own" ON public.fcm_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "fcm_tokens_update_own" ON public.fcm_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "fcm_tokens_delete_own" ON public.fcm_tokens
  FOR DELETE USING (user_id = auth.uid());

-- Remove stale tokens (unused 90+ days).
CREATE OR REPLACE FUNCTION public.cleanup_stale_fcm_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.fcm_tokens
  WHERE last_used_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_fcm_tokens() FROM PUBLIC;

-- Notification retention: read > 90 days, unread > 180 days.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  read_deleted integer;
  unread_deleted integer;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = true
    AND created_at < now() - interval '90 days';
  GET DIAGNOSTICS read_deleted = ROW_COUNT;

  DELETE FROM public.notifications
  WHERE is_read = false
    AND created_at < now() - interval '180 days';
  GET DIAGNOSTICS unread_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'read_deleted', read_deleted,
    'unread_deleted', unread_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
