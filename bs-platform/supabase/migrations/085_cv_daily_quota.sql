-- 085_cv_daily_quota.sql
-- Report BS-34: cap CV generate/edit operations per user per day.
--
-- The existing check_rate_limit() only returns a boolean, so the UI cannot show
-- "N attempts left, resets at X". These variants return the usage counter and
-- the window start so the caller can compute both.

-- Consuming check: increments and reports the resulting usage.
CREATE OR REPLACE FUNCTION public.check_rate_limit_detailed(
  p_bucket text,
  p_max integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, used integer, window_started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer;
  v_start timestamptz;
BEGIN
  INSERT INTO public.rate_limits (bucket, count, window_start)
  VALUES (p_bucket, 1, v_now)
  ON CONFLICT (bucket) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          THEN 1 ELSE public.rate_limits.count + 1 END,
        window_start = CASE
          WHEN public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          THEN v_now ELSE public.rate_limits.window_start END
  RETURNING public.rate_limits.count, public.rate_limits.window_start
  INTO v_count, v_start;

  RETURN QUERY SELECT (v_count <= p_max), v_count, v_start;
END;
$$;

-- Non-consuming peek, so a page can display the remaining allowance.
CREATE OR REPLACE FUNCTION public.peek_rate_limit(
  p_bucket text,
  p_window_seconds integer
)
RETURNS TABLE(used integer, window_started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer := 0;
  v_start timestamptz;
BEGIN
  SELECT r.count, r.window_start INTO v_count, v_start
    FROM public.rate_limits r WHERE r.bucket = p_bucket;

  IF v_start IS NULL OR v_start < v_now - make_interval(secs => p_window_seconds) THEN
    RETURN QUERY SELECT 0, v_now;
  ELSE
    RETURN QUERY SELECT v_count, v_start;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit_detailed(text, integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.peek_rate_limit(text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_detailed(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.peek_rate_limit(text, integer) TO service_role;

-- Per-account override of the global daily allowance (NULL = use the global).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cv_daily_allowance integer
  CHECK (cv_daily_allowance IS NULL OR cv_daily_allowance >= 0);
