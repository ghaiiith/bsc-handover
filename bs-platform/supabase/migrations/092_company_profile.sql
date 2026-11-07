-- Report BS-47: organisations need their own profile, not the student CV form.
-- These columns hold the company profile; completion (report BS-46) is measured
-- against them for company accounts.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_industry text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_logo_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_location text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_description text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_website text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_contact_email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_contact_phone text;

-- Self-writes to public.users go through the service-role client (self-escalation
-- lockdown), so no new column grants are required for the authenticated role —
-- the profile save route uses the admin client. Backfill company name/sector/size
-- from what onboarding already captured.
UPDATE public.users
SET company_name = COALESCE(company_name, onboarding_company_name),
    company_industry = COALESCE(company_industry, onboarding_company_industry),
    company_size = COALESCE(company_size, onboarding_company_size)
WHERE role = 'company';

COMMENT ON COLUMN public.users.company_name IS 'Report BS-47: organisation profile — company accounts only.';
