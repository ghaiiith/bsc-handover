-- Revenue & Commission Management Engine
-- Backward compatible: existing payments keep NULL snapshot columns.

-- ── Instructor revenue agreements (immutable history, one active per instructor) ──
CREATE TABLE IF NOT EXISTS instructor_revenue_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_percentage numeric(5,2) NOT NULL
    CHECK (platform_percentage >= 0 AND platform_percentage <= 100),
  instructor_percentage numeric(5,2) NOT NULL
    CHECK (instructor_percentage >= 0 AND instructor_percentage <= 100),
  effective_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_revenue_agreement_sum CHECK (platform_percentage + instructor_percentage = 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_agreement_per_instructor
  ON instructor_revenue_agreements(instructor_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_revenue_agreements_instructor
  ON instructor_revenue_agreements(instructor_id, created_at DESC);

-- ── Payment gateway fee configuration (provider-specific, admin-editable) ──
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  gateway_id text PRIMARY KEY,
  display_name text NOT NULL,
  gateway_type text NOT NULL DEFAULT 'local'
    CHECK (gateway_type IN ('local', 'international')),
  percentage_fee numeric(8,4) NOT NULL DEFAULT 0
    CHECK (percentage_fee >= 0 AND percentage_fee <= 100),
  fixed_fee numeric(14,2) NOT NULL DEFAULT 0
    CHECK (fixed_fee >= 0),
  currency text NOT NULL DEFAULT 'IQD',
  settlement_delay_days integer NOT NULL DEFAULT 0,
  refund_fee numeric(14,2) NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO payment_gateway_configs (
  gateway_id, display_name, gateway_type, percentage_fee, fixed_fee, currency
) VALUES
  ('zaincash', 'ZainCash', 'local', 2.5, 600, 'IQD'),
  ('qicard', 'QiCard', 'local', 2.5, 600, 'IQD'),
  ('virtual', 'Virtual / Test', 'local', 0, 0, 'IQD'),
  ('fib', 'FIB', 'local', 2.5, 600, 'IQD'),
  ('stripe', 'Stripe', 'international', 3.5, 600, 'IQD'),
  ('paypal', 'PayPal', 'international', 3.5, 600, 'IQD')
ON CONFLICT (gateway_id) DO NOTHING;

-- International variant configs (same gateway, different fee tier)
INSERT INTO payment_gateway_configs (
  gateway_id, display_name, gateway_type, percentage_fee, fixed_fee, currency, enabled
) VALUES
  ('zaincash_intl', 'ZainCash (International)', 'international', 3.5, 600, 'IQD', false),
  ('qicard_intl', 'QiCard (International)', 'international', 3.5, 600, 'IQD', false)
ON CONFLICT (gateway_id) DO NOTHING;

-- ── Immutable financial snapshot on payments (NULL = legacy pre-engine row) ──
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gross_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS gateway_type text
    CHECK (gateway_type IS NULL OR gateway_type IN ('local', 'international')),
  ADD COLUMN IF NOT EXISTS gateway_percentage numeric(8,4),
  ADD COLUMN IF NOT EXISTS gateway_fixed_fee numeric(14,2),
  ADD COLUMN IF NOT EXISTS gateway_total_fee numeric(14,2),
  ADD COLUMN IF NOT EXISTS net_received_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS platform_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS instructor_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS platform_revenue numeric(14,2),
  ADD COLUMN IF NOT EXISTS instructor_revenue numeric(14,2),
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES instructor_revenue_agreements(id),
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(14,6),
  ADD COLUMN IF NOT EXISTS financial_snapshot_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending';

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payout_status_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_payout_status_check
  CHECK (payout_status IN ('pending', 'processing', 'paid', 'held'));

CREATE INDEX IF NOT EXISTS idx_payments_agreement ON payments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_payments_financial_snapshot ON payments(financial_snapshot_at);

-- ── Backfill active agreements from existing per-instructor rates (one-time) ──
INSERT INTO instructor_revenue_agreements (
  instructor_id,
  platform_percentage,
  instructor_percentage,
  effective_date,
  status,
  notes
)
SELECT
  u.id,
  100 - COALESCE(u.commission_instructor_pct, ps_inst.value::numeric),
  COALESCE(u.commission_instructor_pct, ps_inst.value::numeric),
  now(),
  'active',
  'Migrated from legacy commission settings'
FROM users u
CROSS JOIN LATERAL (
  SELECT value FROM platform_settings WHERE key = 'commission_instructor_pct' LIMIT 1
) ps_inst
WHERE u.role = 'instructor'
  AND (
    u.commission_instructor_pct IS NOT NULL
    OR ps_inst.value IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM instructor_revenue_agreements a
    WHERE a.instructor_id = u.id AND a.status = 'active'
  )
ON CONFLICT DO NOTHING;

-- ── Discount party caps now read active revenue agreement ──
CREATE OR REPLACE FUNCTION validate_discount_party_limit()
RETURNS trigger AS $$
DECLARE
  v_instructor_pct numeric;
  v_platform_pct numeric;
  v_max_pct numeric;
BEGIN
  IF NEW.is_full_override = true AND NEW.party = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.course_id IS NOT NULL THEN
    SELECT a.instructor_percentage, a.platform_percentage
    INTO v_instructor_pct, v_platform_pct
    FROM courses c
    JOIN instructor_revenue_agreements a
      ON a.instructor_id = c.instructor_id AND a.status = 'active'
    WHERE c.id = NEW.course_id;
  END IF;

  -- No agreement => no discount allowed (forces admin to configure first)
  IF v_instructor_pct IS NULL THEN
    RAISE EXCEPTION 'No active revenue agreement for this course instructor. Configure an agreement before applying discounts.';
  END IF;

  IF NEW.party = 'admin' THEN
    v_max_pct := v_platform_pct;
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

ALTER TABLE instructor_revenue_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_configs ENABLE ROW LEVEL SECURITY;
