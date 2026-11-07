-- Report BS-49: gate AI features behind a Pro tier. There was no per-user
-- subscription before (only employer/company plans), so this adds a lightweight
-- per-user Pro grant. `pro_until` in the future = active Pro. Admin-grantable;
-- companies with an active employer subscription also count as Pro (see
-- src/lib/subscription/pro-access.ts).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pro_until timestamptz;

COMMENT ON COLUMN public.users.pro_until IS
  'Report BS-49: Pro subscription expiry. A timestamp in the future means the '
  'account has Pro (AI features). NULL / past = not Pro. Admin-grantable.';

-- Which AI feature groups are gated behind Pro is admin-configurable via
-- platform_settings.ai_pro_features (a JSON array of feature keys). Seeded empty
-- so nothing breaks on deploy; the admin turns gating on per feature. Keys:
-- 'ai_cv' (CV builder AI), 'ai_course' (AI course creation), 'ai_matching'
-- (candidate matching).
INSERT INTO public.platform_settings (key, value)
VALUES ('ai_pro_features', '[]')
ON CONFLICT (key) DO NOTHING;
