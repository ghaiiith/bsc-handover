-- Report BS-04 fix: enforce a single active session using the GoTrue session id
-- that every access token already carries (the `session_id` JWT claim), instead
-- of a custom epoch mirrored into app_metadata.
--
-- The old epoch approach rotated a value into app_metadata on every login and
-- required a token refresh for the current device's JWT to catch up. That
-- refresh raced with the browser Supabase client, so a fresh login superseded
-- its own just-issued JWT and bounced the user back to /login.
--
-- `session_id` needs no refresh — it is present from the moment of login — so
-- storing the blessed session id and comparing it in the proxy is race-free.
--
-- New column left NULL for existing users: enforcement only begins after a
-- user's next login writes their current session id, so nobody is signed out by
-- the deploy.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_session_id text;

COMMENT ON COLUMN public.users.active_session_id IS
  'Report BS-04: the GoTrue session_id of the account''s single blessed session. '
  'Set on each login; the proxy signs out any device whose JWT session_id differs. '
  'NULL means single-session is not yet enforced for this user (pre-migration login).';
