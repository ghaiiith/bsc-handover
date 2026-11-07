-- Report BS-78: admin-configurable revenue split PER COURSE.
-- Resolution order everywhere: course override → instructor agreement → platform
-- default (commission_rate). Value is the PLATFORM percentage on the net amount
-- (after gateway fees); the instructor keeps 100 - this.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS platform_commission_pct numeric(5,2)
  CHECK (platform_commission_pct IS NULL
    OR (platform_commission_pct >= 0 AND platform_commission_pct <= 100));
