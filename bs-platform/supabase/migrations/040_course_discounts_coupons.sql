-- Course discounts (split-aware) and one-time coupon codes.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_discount_percent numeric NOT NULL DEFAULT 0
    CHECK (instructor_discount_percent >= 0 AND instructor_discount_percent <= 100),
  ADD COLUMN IF NOT EXISTS platform_discount_percent numeric NOT NULL DEFAULT 0
    CHECK (platform_discount_percent >= 0 AND platform_discount_percent <= 100);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS list_price numeric,
  ADD COLUMN IF NOT EXISTS instructor_discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id uuid;

UPDATE platform_settings
SET value = '30'
WHERE key = 'commission_rate';

CREATE TABLE IF NOT EXISTS coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent_of_price', 'fixed_iqd')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  funded_by text NOT NULL CHECK (funded_by IN ('instructor', 'platform', 'split')),
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_coupon_codes_course ON coupon_codes(course_id);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON coupon_codes(is_active);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemptions_once_per_user UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id);

ALTER TABLE payments
  ADD CONSTRAINT payments_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES coupon_codes(id) ON DELETE SET NULL;

ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Public can read active coupons by code (via server); students read own redemptions.
CREATE POLICY "coupon_redemptions_read_own" ON coupon_redemptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coupon_redemptions_insert_own" ON coupon_redemptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
