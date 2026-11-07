-- Report BS-70: Company Academy bulk seat purchases (real payment).
-- A company buys N seats of a course at the tiered bulk price; on payment the
-- purchase is marked paid and the course instructor is credited like a sale.

CREATE TABLE IF NOT EXISTS academy_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  seats integer NOT NULL CHECK (seats >= 1),
  unit_price integer NOT NULL,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  total_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_purchases_company ON academy_purchases(company_id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS academy_purchase_id uuid REFERENCES academy_purchases(id);
CREATE INDEX IF NOT EXISTS idx_payments_academy ON payments(academy_purchase_id);

ALTER TABLE academy_purchases ENABLE ROW LEVEL SECURITY;

-- A company sees its own academy purchases; writes go through the service role.
DROP POLICY IF EXISTS academy_purchases_owner_read ON academy_purchases;
CREATE POLICY academy_purchases_owner_read ON academy_purchases
  FOR SELECT USING (company_id = auth.uid());
