-- Full replacement: discounts & coupons system (additive % of list price, 30/70 party caps).

-- ── Tear down legacy system ─────────────────────────────────────────────
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_coupon_id_fkey;

DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS coupon_codes CASCADE;
DROP TABLE IF EXISTS discount_offer_courses CASCADE;
DROP TABLE IF EXISTS discount_offers CASCADE;
DROP TABLE IF EXISTS coupon_uses CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS course_discounts CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS discount_logs CASCADE;

ALTER TABLE courses
  DROP COLUMN IF EXISTS instructor_discount_percent,
  DROP COLUMN IF EXISTS platform_discount_percent;

ALTER TABLE payments
  DROP COLUMN IF EXISTS list_price,
  DROP COLUMN IF EXISTS instructor_discount_amount,
  DROP COLUMN IF EXISTS platform_discount_amount,
  DROP COLUMN IF EXISTS coupon_discount_amount;

ALTER TABLE payments
  DROP COLUMN IF EXISTS coupon_id;

-- ── New tables ───────────────────────────────────────────────────────────
CREATE TABLE course_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  party text NOT NULL CHECK (party IN ('admin', 'instructor')),
  discount_percentage numeric(5,2) NOT NULL CHECK (
    discount_percentage > 0 AND discount_percentage <= 100
  ),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  label text,
  label_ar text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT course_discounts_ends_after_start CHECK (ends_at > starts_at),
  CONSTRAINT chk_admin_limit CHECK (party != 'admin' OR discount_percentage <= 30),
  CONSTRAINT chk_instructor_limit CHECK (party != 'instructor' OR discount_percentage <= 70)
);

CREATE UNIQUE INDEX idx_course_discounts_active_party
  ON course_discounts (course_id, party)
  WHERE is_active = true;

CREATE INDEX idx_course_discounts_course ON course_discounts(course_id);
CREATE INDEX idx_course_discounts_ends_at ON course_discounts(ends_at);
CREATE INDEX idx_course_discounts_active ON course_discounts(is_active, ends_at);
CREATE INDEX idx_course_discounts_created_by ON course_discounts(created_by);

CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES users(id),
  party text NOT NULL CHECK (party IN ('admin', 'instructor')),
  scope text NOT NULL CHECK (scope IN ('platform', 'course')),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  discount_percentage numeric(5,2) NOT NULL CHECK (
    discount_percentage > 0 AND discount_percentage <= 100
  ),
  max_uses int,
  current_uses int NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT chk_coupon_admin_limit CHECK (party != 'admin' OR discount_percentage <= 30),
  CONSTRAINT chk_coupon_instructor_limit CHECK (party != 'instructor' OR discount_percentage <= 70),
  CONSTRAINT chk_platform_scope_admin CHECK (scope != 'platform' OR party = 'admin'),
  CONSTRAINT chk_course_scope_has_course CHECK (scope != 'course' OR course_id IS NOT NULL)
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_course ON coupons(course_id);
CREATE INDEX idx_coupons_created_by ON coupons(created_by);
CREATE INDEX idx_coupons_active ON coupons(is_active, ends_at);

CREATE TABLE coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id),
  discount_percentage_applied numeric(5,2) NOT NULL,
  original_price numeric NOT NULL,
  final_price numeric NOT NULL,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions(user_id);

CREATE TABLE discount_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id),
  user_id uuid REFERENCES users(id),
  payment_id uuid REFERENCES payments(id),
  original_price numeric NOT NULL,
  admin_discount_pct numeric(5,2) DEFAULT 0,
  instructor_discount_pct numeric(5,2) DEFAULT 0,
  coupon_discount_pct numeric(5,2) DEFAULT 0,
  total_discount_pct numeric(5,2) NOT NULL,
  final_price numeric NOT NULL,
  coupon_id uuid REFERENCES coupons(id),
  discount_ids uuid[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments
  ADD COLUMN coupon_id uuid REFERENCES coupons(id),
  ADD COLUMN discount_snapshot jsonb;

-- ── Pricing function (single source of truth) ─────────────────────────────
CREATE OR REPLACE FUNCTION calculate_course_price(
  p_course_id uuid,
  p_coupon_code text DEFAULT NULL
)
RETURNS TABLE (
  original_price numeric,
  admin_discount_pct numeric,
  instructor_discount_pct numeric,
  coupon_discount_pct numeric,
  total_discount_pct numeric,
  final_price numeric,
  coupon_id uuid,
  admin_discount_id uuid,
  instructor_discount_id uuid,
  savings numeric
) AS $$
DECLARE
  v_original_price numeric;
  v_admin_disc_pct numeric := 0;
  v_admin_disc_id uuid;
  v_instructor_disc_pct numeric := 0;
  v_instructor_disc_id uuid;
  v_coupon_disc_pct numeric := 0;
  v_coupon_id uuid;
  v_total_disc_pct numeric;
  v_final_price numeric;
  v_coupon RECORD;
BEGIN
  PERFORM expire_old_discounts();

  SELECT price INTO v_original_price
  FROM courses WHERE id = p_course_id AND status = 'published';

  IF v_original_price IS NULL THEN
    RAISE EXCEPTION 'Course not found or not published';
  END IF;

  SELECT cd.id, cd.discount_percentage
  INTO v_admin_disc_id, v_admin_disc_pct
  FROM course_discounts cd
  WHERE cd.course_id = p_course_id
    AND cd.party = 'admin'
    AND cd.is_active = true
    AND cd.starts_at <= now()
    AND cd.ends_at > now()
  ORDER BY cd.discount_percentage DESC
  LIMIT 1;

  SELECT cd.id, cd.discount_percentage
  INTO v_instructor_disc_id, v_instructor_disc_pct
  FROM course_discounts cd
  WHERE cd.course_id = p_course_id
    AND cd.party = 'instructor'
    AND cd.is_active = true
    AND cd.starts_at <= now()
    AND cd.ends_at > now()
  ORDER BY cd.discount_percentage DESC
  LIMIT 1;

  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    SELECT * INTO v_coupon
    FROM coupons c
    WHERE c.code = upper(trim(p_coupon_code))
      AND c.is_active = true
      AND c.starts_at <= now()
      AND (c.ends_at IS NULL OR c.ends_at > now())
      AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
      AND (c.scope = 'platform' OR c.course_id = p_course_id);

    IF v_coupon.id IS NOT NULL THEN
      v_coupon_disc_pct := v_coupon.discount_percentage;
      v_coupon_id := v_coupon.id;
    END IF;
  END IF;

  v_total_disc_pct := LEAST(
    COALESCE(v_admin_disc_pct, 0) +
    COALESCE(v_instructor_disc_pct, 0) +
    COALESCE(v_coupon_disc_pct, 0),
    100
  );

  v_final_price := GREATEST(
    ROUND(v_original_price * (1 - v_total_disc_pct / 100), 0),
    0
  );

  RETURN QUERY SELECT
    v_original_price,
    COALESCE(v_admin_disc_pct, 0),
    COALESCE(v_instructor_disc_pct, 0),
    COALESCE(v_coupon_disc_pct, 0),
    v_total_disc_pct,
    v_final_price,
    v_coupon_id,
    v_admin_disc_id,
    v_instructor_disc_id,
    v_original_price - v_final_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION expire_old_discounts()
RETURNS void AS $$
BEGIN
  UPDATE course_discounts
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND ends_at <= now();

  UPDATE coupons
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND ends_at IS NOT NULL AND ends_at <= now();
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_discounts_updated_at ON course_discounts;
CREATE TRIGGER course_discounts_updated_at
  BEFORE UPDATE ON course_discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE course_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discounts_public_read_active" ON course_discounts
  FOR SELECT USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE POLICY "discounts_instructor_manage_own" ON course_discounts
  FOR ALL USING (
    created_by = auth.uid()
    AND party = 'instructor'
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_id AND instructor_id = auth.uid()
    )
  );

CREATE POLICY "discounts_admin_all" ON course_discounts
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "coupons_instructor_manage_own" ON coupons
  FOR ALL USING (created_by = auth.uid() AND party = 'instructor');

CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "coupons_public_validate" ON coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "redemptions_user_own" ON coupon_redemptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "redemptions_insert_own" ON coupon_redemptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "redemptions_admin_all" ON coupon_redemptions
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "discount_logs_admin" ON discount_logs
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "discount_logs_insert_service" ON discount_logs
  FOR INSERT WITH CHECK (true);
