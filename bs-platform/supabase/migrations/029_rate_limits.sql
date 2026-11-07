-- 029_rate_limits.sql
-- M2 fix: rate limiting was in-memory (Map per process), so it reset on cold
-- start and was NOT shared across Vercel serverless instances. The effective
-- limit was therefore MAX x (number of concurrent instances), i.e. no real cap
-- on expensive Claude/AI calls under load.
--
-- This adds a durable, atomic, fixed-window rate limiter backed by Postgres.
-- A single UPSERT performs the increment-or-reset atomically, so concurrent
-- requests across instances are serialized per bucket row. Only the service_role
-- (admin client) may execute it; anon/authenticated have no access.

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Lock the table down: only service_role (which bypasses RLS) ever touches it.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rate_limits FROM anon, authenticated;

-- Helps the periodic cleanup of stale buckets.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits (window_start);

-- Atomic fixed-window check. Returns true when the request is allowed.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count int;
BEGIN
  INSERT INTO rate_limits (bucket, count, window_start)
  VALUES (p_bucket, 1, v_now)
  ON CONFLICT (bucket) DO UPDATE
    SET
      count = CASE
        WHEN rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          THEN v_now
        ELSE rate_limits.window_start
      END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(text, int, int) FROM public;
REVOKE ALL ON FUNCTION check_rate_limit(text, int, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO service_role;

-- Optional cleanup of stale buckets (call from a cron). Removes rows whose
-- window ended more than p_older_than_seconds ago.
CREATE OR REPLACE FUNCTION cleanup_rate_limits(p_older_than_seconds int DEFAULT 86400)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limits
  WHERE window_start < now() - make_interval(secs => p_older_than_seconds);
$$;

REVOKE ALL ON FUNCTION cleanup_rate_limits(int) FROM public;
REVOKE ALL ON FUNCTION cleanup_rate_limits(int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits(int) TO service_role;
