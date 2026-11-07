-- Full company profile (per the client's Company-Profile-Fields spec). Extends
-- the BS-47 company columns with Identity, About, HR contact, Employer brand,
-- Billing (private), Academy, and verification fields. Student-only fields
-- (headline, skills, CV, education, experience, certs, portfolio) are simply not
-- shown on the company form — no schema change needed for their removal.

-- Identity
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_name_ar text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_type text;          -- slug: limited / sole / foreign_branch / ngo / government
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_governorate text;   -- slug of the 18 governorates
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_city text;          -- free text area under the governorate

-- About
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_description_en text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_tagline text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_year_founded integer;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_socials jsonb;      -- {linkedin, instagram, facebook}
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_branches jsonb;     -- [{governorate, city}]

-- HR contact (email/phone PRIVATE by default)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hr_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hr_role text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hr_email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hr_phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hr_preferred_contact text; -- email / whatsapp / in_platform
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hiring_roles text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_hires_grads boolean;

-- Employer brand
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_workplace_photos text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_benefits text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_working_hours text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_culture_blurb text;

-- Billing (PRIVATE — never public)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_billing_entity text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_commercial_reg text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_tax_number text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_billing_email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_billing_address text;

-- Academy
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_academy_seats integer;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_academy_departments text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_academy_focus text[];

-- System: verification tier (unverified -> domain_verified -> verified)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS company_verification_status text NOT NULL DEFAULT 'unverified';

COMMENT ON COLUMN public.users.company_hr_email IS 'PRIVATE — HR/sales contact, never shown publicly.';
COMMENT ON COLUMN public.users.company_billing_entity IS 'PRIVATE billing detail — never public.';
