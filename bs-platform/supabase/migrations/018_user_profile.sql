-- User profile fields for AI features, job matching, and portfolio.

ALTER TABLE users ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience int;
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING gin (skills);
CREATE INDEX IF NOT EXISTS idx_users_location ON users (location);

-- Profile completion score (0–100) for dashboard and sidebar.
CREATE OR REPLACE FUNCTION get_profile_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u users%ROWTYPE;
  score integer := 0;
  link_count integer := 0;
BEGIN
  SELECT * INTO u FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF u.full_name IS NOT NULL AND btrim(u.full_name) <> '' THEN
    score := score + 10;
  END IF;

  IF u.avatar_url IS NOT NULL AND btrim(u.avatar_url) <> '' THEN
    score := score + 10;
  END IF;

  IF u.headline IS NOT NULL AND btrim(u.headline) <> '' THEN
    score := score + 10;
  END IF;

  IF u.bio IS NOT NULL AND btrim(u.bio) <> '' THEN
    score := score + 10;
  END IF;

  IF u.skills IS NOT NULL AND coalesce(array_length(u.skills, 1), 0) >= 3 THEN
    score := score + 15;
  END IF;

  IF u.experience IS NOT NULL AND jsonb_array_length(u.experience) >= 1 THEN
    score := score + 15;
  END IF;

  IF u.education IS NOT NULL AND jsonb_array_length(u.education) >= 1 THEN
    score := score + 10;
  END IF;

  IF u.location IS NOT NULL AND btrim(u.location) <> '' THEN
    score := score + 5;
  END IF;

  IF u.preferred_role IS NOT NULL AND btrim(u.preferred_role) <> '' THEN
    score := score + 10;
  END IF;

  IF u.links IS NOT NULL THEN
    link_count := 0;
    IF coalesce(u.links->>'linkedin', '') <> '' THEN link_count := link_count + 1; END IF;
    IF coalesce(u.links->>'github', '') <> '' THEN link_count := link_count + 1; END IF;
    IF coalesce(u.links->>'website', '') <> '' THEN link_count := link_count + 1; END IF;
    IF coalesce(u.links->>'twitter', '') <> '' THEN link_count := link_count + 1; END IF;
    IF link_count >= 1 THEN score := score + 5; END IF;
  END IF;

  RETURN score;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_score(uuid) TO authenticated;

-- Public profile view (portfolio / public pages — no private JSONB fields).
CREATE OR REPLACE VIEW user_public_profiles AS
SELECT
  id,
  full_name,
  full_name_ar,
  avatar_url,
  headline,
  skills,
  bio,
  location,
  availability,
  role
FROM users;

GRANT SELECT ON user_public_profiles TO anon, authenticated;
