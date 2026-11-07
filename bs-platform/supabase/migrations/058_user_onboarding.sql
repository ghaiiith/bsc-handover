-- Mandatory onboarding fields (Business Skills)
-- Additive only; account_type nullable until user completes onboarding.

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type text
  CHECK (account_type IS NULL OR account_type IN ('student', 'instructor', 'company'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_goal text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_level text
  CHECK (skill_level IS NULL OR skill_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_source text
  CHECK (
    discovery_source IS NULL OR discovery_source IN (
      'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'google',
      'friend', 'university', 'ad', 'instructor', 'company', 'other'
    )
  );
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_source_other text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_updated_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instructor_intent text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_intent text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_company_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_company_industry text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_company_size text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users (onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users (account_type)
  WHERE account_type IS NOT NULL;
