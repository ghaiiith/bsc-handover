-- Freelancer role: service sellers with dedicated onboarding and RBAC role.

-- Extend RBAC role enum
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'instructor', 'admin', 'company', 'freelancer'));

-- Extend onboarding account_type (058 added inline CHECK — drop before re-adding)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_type_check;

DO $drop_account_type_check$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%account_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $drop_account_type_check$;

ALTER TABLE users ADD CONSTRAINT users_account_type_check
  CHECK (account_type IS NULL OR account_type IN ('student', 'instructor', 'company', 'freelancer'));

-- Freelancer onboarding intent (mirrors instructor_intent / company_intent pattern)
ALTER TABLE users ADD COLUMN IF NOT EXISTS freelancer_intent text;
