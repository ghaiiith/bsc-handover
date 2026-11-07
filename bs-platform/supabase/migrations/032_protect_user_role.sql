-- Prevent signed-in users from changing their own role via the API.
-- Admins should be promoted with the service role / SQL editor (see supabase/SETUP.md).

CREATE OR REPLACE FUNCTION public.protect_users_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_role_self_update ON public.users;

CREATE TRIGGER users_protect_role_self_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_users_role_self_update();
