-- Backfill onboarding for existing users (production-safe strategy).
-- New signups keep onboarding_completed=false until they complete the flow.
--
-- Strategy:
-- - admin / instructor / company / student: mark onboarding complete
-- - set account_type from role where applicable
-- - students default to account_type=student to avoid forcing legacy users through onboarding

UPDATE users
SET
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
  account_type = 'instructor'
WHERE role = 'instructor' AND NOT onboarding_completed;

UPDATE users
SET
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
  account_type = 'company'
WHERE role = 'company' AND NOT onboarding_completed;

UPDATE users
SET
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
  account_type = COALESCE(account_type, 'student')
WHERE role = 'admin' AND NOT onboarding_completed;

UPDATE users
SET
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
  account_type = 'student'
WHERE role = 'student' AND NOT onboarding_completed;
