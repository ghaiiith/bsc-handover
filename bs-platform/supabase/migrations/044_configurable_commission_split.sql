-- Feature 1: Configurable Commission Split
-- Makes the platform/instructor revenue split (previously hardcoded 30/70)
-- admin-configurable. Discount party caps read the split dynamically via
-- triggers instead of static CHECK constraints.

-- ── PART A — Settings rows ────────────────────────────────────────────────
INSERT INTO platform_settings (key, value) VALUES
  ('commission_admin_pct', '30'),
  ('commission_instructor_pct', '70')
ON CONFLICT (key) DO NOTHING;

-- Cross-row invariant: the two shares must always sum to 100.
--
-- NOTE (deviation from the literal spec): the spec used a BEFORE ROW trigger,
-- but a plain BEFORE trigger makes it impossible to move from one valid split
-- to another (e.g. 30/70 -> 40/60), because updating either row on its own
-- transiently breaks the sum-to-100 invariant and the other row still holds its
-- old value. We therefore use a DEFERRABLE CONSTRAINT TRIGGER (checked at COMMIT)
-- so both rows can be updated atomically within one transaction. Direct manual
-- single-row edits are still rejected at commit, preserving the invariant.
CREATE OR REPLACE FUNCTION validate_commission_split()
RETURNS trigger AS $$
DECLARE
  v_admin_pct numeric;
  v_instructor_pct numeric;
BEGIN
  IF NEW.key = 'commission_admin_pct' THEN
    v_admin_pct := NEW.value::numeric;
    SELECT value::numeric INTO v_instructor_pct
    FROM platform_settings WHERE key = 'commission_instructor_pct';
  ELSIF NEW.key = 'commission_instructor_pct' THEN
    v_instructor_pct := NEW.value::numeric;
    SELECT value::numeric INTO v_admin_pct
    FROM platform_settings WHERE key = 'commission_admin_pct';
  ELSE
    RETURN NEW; -- not a commission key, skip validation
  END IF;

  IF v_admin_pct IS NOT NULL AND v_instructor_pct IS NOT NULL THEN
    IF v_admin_pct < 0 OR v_admin_pct > 100 THEN
      RAISE EXCEPTION 'Admin commission must be between 0 and 100';
    END IF;
    IF v_instructor_pct < 0 OR v_instructor_pct > 100 THEN
      RAISE EXCEPTION 'Instructor commission must be between 0 and 100';
    END IF;
    IF v_admin_pct + v_instructor_pct != 100 THEN
      RAISE EXCEPTION 'Commission split must sum to 100%% (got %+% = %)',
        v_admin_pct, v_instructor_pct, v_admin_pct + v_instructor_pct;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_commission_split ON platform_settings;
CREATE CONSTRAINT TRIGGER check_commission_split
  AFTER INSERT OR UPDATE ON platform_settings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (NEW.key IN ('commission_admin_pct', 'commission_instructor_pct'))
  EXECUTE FUNCTION validate_commission_split();

-- Atomic setter so the two shares can be updated together within one txn.
-- Only the service_role (admin client) invokes this.
CREATE OR REPLACE FUNCTION set_commission_split(
  p_admin_pct numeric,
  p_instructor_pct numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_pct < 0 OR p_admin_pct > 100
     OR p_instructor_pct < 0 OR p_instructor_pct > 100 THEN
    RAISE EXCEPTION 'Commission shares must be between 0 and 100';
  END IF;
  IF p_admin_pct + p_instructor_pct != 100 THEN
    RAISE EXCEPTION 'Commission split must sum to 100 (got % + % = %)',
      p_admin_pct, p_instructor_pct, p_admin_pct + p_instructor_pct;
  END IF;

  INSERT INTO platform_settings (key, value, updated_at)
  VALUES ('commission_admin_pct', p_admin_pct::text, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO platform_settings (key, value, updated_at)
  VALUES ('commission_instructor_pct', p_instructor_pct::text, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION set_commission_split(numeric, numeric) FROM public;
REVOKE ALL ON FUNCTION set_commission_split(numeric, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION set_commission_split(numeric, numeric) TO service_role;

-- ── Feature 2 dependency — admin full-discount override flag ───────────────
-- Added here so the dynamic party-cap trigger below can reference it. The
-- full-override UX/logic is built in Feature 2; the column defaults to false
-- so existing behaviour is unchanged.
ALTER TABLE course_discounts
  ADD COLUMN IF NOT EXISTS is_full_override boolean NOT NULL DEFAULT false;
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS is_full_override boolean NOT NULL DEFAULT false;

-- ── PART C — Dynamic discount party-cap validation ────────────────────────
-- CHECK constraints cannot read another table, so the hardcoded 30/70 caps
-- move to a trigger that reads the configurable split.
ALTER TABLE course_discounts DROP CONSTRAINT IF EXISTS chk_admin_limit;
ALTER TABLE course_discounts DROP CONSTRAINT IF EXISTS chk_instructor_limit;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS chk_coupon_admin_limit;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS chk_coupon_instructor_limit;

CREATE OR REPLACE FUNCTION validate_discount_party_limit()
RETURNS trigger AS $$
DECLARE
  v_max_pct numeric;
BEGIN
  -- Admin full-discount overrides bypass the cap entirely (Feature 2).
  IF NEW.is_full_override = true AND NEW.party = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.party = 'admin' THEN
    SELECT value::numeric INTO v_max_pct
    FROM platform_settings WHERE key = 'commission_admin_pct';
  ELSIF NEW.party = 'instructor' THEN
    SELECT value::numeric INTO v_max_pct
    FROM platform_settings WHERE key = 'commission_instructor_pct';
  END IF;

  IF v_max_pct IS NOT NULL AND NEW.discount_percentage > v_max_pct THEN
    RAISE EXCEPTION 'discount_percentage % exceeds the max allowed share of % for party %',
      NEW.discount_percentage, v_max_pct, NEW.party;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_course_discount_limit ON course_discounts;
CREATE TRIGGER check_course_discount_limit
  BEFORE INSERT OR UPDATE ON course_discounts
  FOR EACH ROW EXECUTE FUNCTION validate_discount_party_limit();

DROP TRIGGER IF EXISTS check_coupon_limit ON coupons;
CREATE TRIGGER check_coupon_limit
  BEFORE INSERT OR UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION validate_discount_party_limit();

-- ── PART B — calculate_course_price() ─────────────────────────────────────
-- No change required: the current calculate_course_price() (migration 042)
-- contains NO hardcoded 30/70 values. Discounts are additive percentages of
-- the list price capped at 100; the per-party caps are enforced only at
-- create/update time, which is now handled dynamically by the triggers above.
-- Leaving the pricing function untouched avoids introducing regressions.
