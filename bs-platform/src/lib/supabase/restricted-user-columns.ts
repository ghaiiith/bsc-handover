/**
 * Columns of `public.users` that the `authenticated` Postgres role has NO
 * column-level SELECT grant on.
 *
 * This is not a convention — it is the live grant list. PostgREST rejects the
 * ENTIRE select with `42501 permission denied for table users` if any one of
 * these appears in a query made with the session (RLS) client, and code that
 * destructures only `data` turns that into a silent empty result.
 *
 * That is what hid a real job application from an employer (BS-100) and what
 * made `/api/portfolio/settings` answer 404 for every user. Read these columns
 * through `createAdminClient()`, scoped to the caller's own row.
 *
 * Regenerate with:
 *   select column_name from information_schema.columns c
 *   where table_schema='public' and table_name='users'
 *   and not exists (select 1 from information_schema.column_privileges g
 *     where g.table_schema='public' and g.table_name='users'
 *       and g.grantee='authenticated' and g.privilege_type='SELECT'
 *       and g.column_name=c.column_name);
 */
export const RESTRICTED_USER_COLUMNS: readonly string[] = [
  'accepts_messages',
  'active_session_id',
  'availability_status',
  'commission_instructor_pct',
  'company_academy_departments',
  'company_academy_focus',
  'company_academy_seats',
  'company_benefits',
  'company_billing_address',
  'company_billing_email',
  'company_billing_entity',
  'company_branches',
  'company_city',
  'company_commercial_reg',
  'company_contact_email',
  'company_contact_phone',
  'company_culture_blurb',
  'company_description',
  'company_description_en',
  'company_governorate',
  'company_hires_grads',
  'company_hiring_roles',
  'company_hr_email',
  'company_hr_name',
  'company_hr_phone',
  'company_hr_preferred_contact',
  'company_hr_role',
  'company_industry',
  'company_location',
  'company_logo_url',
  'company_name',
  'company_name_ar',
  'company_size',
  'company_socials',
  'company_tagline',
  'company_tax_number',
  'company_type',
  'company_verification_status',
  'company_website',
  'company_working_hours',
  'company_workplace_photos',
  'company_year_founded',
  'current_session_id',
  'cv_daily_allowance',
  'email',
  'expected_salary_amount',
  'expected_salary_currency',
  'expected_salary_period',
  'expected_salary_public',
  'free_subscription_months',
  'free_subscription_months_used',
  'job_status_ask_enabled',
  'job_status_last_asked_at',
  'phone',
  'portfolio_template_id',
  'pro_until',
  'uploaded_cv_name',
  'uploaded_cv_url',
]
