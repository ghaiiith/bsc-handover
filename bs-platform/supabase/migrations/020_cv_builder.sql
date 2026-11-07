-- CV Builder: saved CV profiles and export history

CREATE TABLE IF NOT EXISTS cv_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  resume_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_template text NOT NULL DEFAULT 'default',
  language text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cv_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES cv_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pdf_storage_path text,
  template_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_profiles_user ON cv_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_exports_profile ON cv_exports(profile_id);
CREATE INDEX IF NOT EXISTS idx_cv_exports_user ON cv_exports(user_id);

DROP TRIGGER IF EXISTS cv_profiles_updated_at ON cv_profiles;
CREATE TRIGGER cv_profiles_updated_at
  BEFORE UPDATE ON cv_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cv_profiles_own_all ON cv_profiles;
CREATE POLICY cv_profiles_own_all ON cv_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cv_exports_own_read ON cv_exports;
CREATE POLICY cv_exports_own_read ON cv_exports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
