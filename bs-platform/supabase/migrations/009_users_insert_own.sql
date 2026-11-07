-- Prerequisite: run 001_schema.sql and 002_rls.sql first.
-- Adds INSERT policy so profile sync works if the signup trigger missed a user.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Table public.users does not exist. Run supabase/migrations/001_schema.sql first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_insert_own'
  ) THEN
    CREATE POLICY "users_insert_own" ON public.users
      FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
END $$;
