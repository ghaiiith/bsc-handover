-- Feature: Per-instructor commission split
-- The platform/instructor revenue split is now set per instructor by the admin,
-- instead of a single global 30/70. Each instructor stores their own instructor
-- share; the admin share is (100 - instructor share). When an instructor has no
-- explicit value, calculations fall back to the platform default
-- (platform_settings.commission_instructor_pct) so nothing breaks for unset users.

-- ── Per-instructor share column ───────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS commission_instructor_pct numeric
  CONSTRAINT chk_users_commission_pct
  CHECK (
    commission_instructor_pct IS NULL
    OR (commission_instructor_pct >= 0 AND commission_instructor_pct <= 100)
  );

COMMENT ON COLUMN users.commission_instructor_pct IS
  'Instructor revenue share (0-100). Admin share is 100 - this value. NULL falls back to the platform default in platform_settings.';

-- ── Discount party-cap validation now reads the per-instructor split ──────
-- CREATE OR REPLACE keeps the existing BEFORE INSERT/UPDATE triggers wired to
-- this function (defined in migration 044).
CREATE OR REPLACE FUNCTION validate_discount_party_limit()
RETURNS trigger AS $$
DECLARE
  v_instructor_pct numeric;
  v_max_pct numeric;
BEGIN
  -- Admin full-discount overrides bypass the cap entirely (Feature 2).
  IF NEW.is_full_override = true AND NEW.party = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Resolve the instructor share for this course's owner.
  IF NEW.course_id IS NOT NULL THEN
    SELECT u.commission_instructor_pct INTO v_instructor_pct
    FROM courses c
    JOIN users u ON u.id = c.instructor_id
    WHERE c.id = NEW.course_id;
  END IF;

  -- Fall back to the platform default when the instructor has no custom rate
  -- (or for platform-scoped coupons that have no course).
  IF v_instructor_pct IS NULL THEN
    SELECT value::numeric INTO v_instructor_pct
    FROM platform_settings WHERE key = 'commission_instructor_pct';
  END IF;

  IF v_instructor_pct IS NULL THEN
    v_instructor_pct := 70; -- last-resort default
  END IF;

  IF NEW.party = 'admin' THEN
    v_max_pct := 100 - v_instructor_pct;
  ELSIF NEW.party = 'instructor' THEN
    v_max_pct := v_instructor_pct;
  END IF;

  IF v_max_pct IS NOT NULL AND NEW.discount_percentage > v_max_pct THEN
    RAISE EXCEPTION 'discount_percentage % exceeds the max allowed share of % for party %',
      NEW.discount_percentage, v_max_pct, NEW.party;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
