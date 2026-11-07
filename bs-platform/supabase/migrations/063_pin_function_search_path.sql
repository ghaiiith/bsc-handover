-- 063_pin_function_search_path.sql
-- Hardening: pin search_path on security-sensitive functions.
--
-- `get_user_role()` is SECURITY DEFINER and is used as the admin gate in ~26 RLS
-- policies (e.g. `get_user_role() = 'admin'`). Without a fixed search_path, a
-- malicious object resolvable ahead of `public` on the caller's search_path could
-- hijack how the function resolves `users` / `auth.uid()`, poisoning every policy
-- that depends on it. Pinning search_path closes that privilege-escalation vector.
--
-- `protect_users_role_self_update()` guards the role-immutability invariant; pin
-- it too for defense in depth.

ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;

ALTER FUNCTION public.protect_users_role_self_update() SET search_path = public, pg_temp;
