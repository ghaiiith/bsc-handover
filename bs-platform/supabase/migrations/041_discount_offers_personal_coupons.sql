-- Discount offers (multi-course, date-bounded campaigns) and personal coupon codes.

CREATE TABLE IF NOT EXISTS discount_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  discount_percent numeric NOT NULL
    CHECK (discount_percent > 0 AND discount_percent <= 100),
  funded_by text NOT NULL CHECK (funded_by IN ('instructor', 'platform')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_offers_dates CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS discount_offer_courses (
  offer_id uuid NOT NULL REFERENCES discount_offers(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_offer_courses_course
  ON discount_offer_courses(course_id);

CREATE INDEX IF NOT EXISTS idx_discount_offers_created_by
  ON discount_offers(created_by);

ALTER TABLE coupon_codes
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES discount_offers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE coupon_codes DROP CONSTRAINT IF EXISTS coupon_codes_discount_type_check;
ALTER TABLE coupon_codes ADD CONSTRAINT coupon_codes_discount_type_check
  CHECK (discount_type IN ('percent_of_price', 'fixed_iqd', 'share_percent'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_offer_assigned_user
  ON coupon_codes(offer_id, assigned_user_id)
  WHERE offer_id IS NOT NULL AND assigned_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupon_codes_assigned_user
  ON coupon_codes(assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;

ALTER TABLE discount_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_offer_courses ENABLE ROW LEVEL SECURITY;
