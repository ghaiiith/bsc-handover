-- Fix signup failures when the auth trigger cannot insert into public.users.
-- Safe to re-run. Run after 001_schema.sql.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
BEGIN
  display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, display_name)
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(
        NULLIF(TRIM(EXCLUDED.full_name), ''),
        public.users.full_name
      );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already linked to another row — do not block auth signup
    RETURN NEW;
  WHEN undefined_table THEN
    RAISE WARNING 'public.users does not exist — run 001_schema.sql';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
