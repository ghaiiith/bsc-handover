-- 074_single_session.sql
-- Report BS-04: enforce a single active session per account.
--
-- `current_session_id` is the canonical "epoch" for the account's live session.
-- It is rotated to a fresh value on every successful sign-in (password or OAuth)
-- and mirrored into the JWT app_metadata as `session_epoch`. The proxy compares
-- the JWT's `session_epoch` against this column on each request; a mismatch means
-- a newer device signed in, so the older session is terminated.
--
-- Deliberately NOT granted to anon/authenticated (see 0440 column lockdown): it is
-- a security token and is only ever read through the service-role admin client.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_session_id text;
