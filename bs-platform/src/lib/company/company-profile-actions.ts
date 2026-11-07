'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  companyProfileSchema,
  getMissingCompanyFields,
  calculateCompanyProfileScore,
  type CompanyProfileInput,
} from '@/lib/company/company-profile'

export async function saveCompanyProfile(
  raw: CompanyProfileInput,
  locale: string
): Promise<{ ok: boolean; error?: string; score?: number; complete?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, profile_completed_at')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'company') return { ok: false, error: 'not_a_company' }

  const parsed = companyProfileSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation_failed' }
  const input = parsed.data

  const missing = getMissingCompanyFields(input)
  const complete = missing.length === 0
  const score = calculateCompanyProfileScore(input)

  const empty = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

  // Self-writes to public.users go through the service-role client.
  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({
      // Identity
      company_name: empty(input.company_name),
      company_name_ar: empty(input.company_name_ar),
      company_logo_url: empty(input.company_logo_url),
      company_type: empty(input.company_type),
      company_industry: empty(input.company_industry),
      company_size: empty(input.company_size),
      company_governorate: empty(input.company_governorate),
      company_city: empty(input.company_city),
      // Keep the legacy single-location column in sync for anything still reading it.
      company_location: empty(input.company_city),
      // About
      company_description: empty(input.company_description),
      company_description_en: empty(input.company_description_en),
      company_tagline: empty(input.company_tagline),
      company_year_founded: input.company_year_founded ?? null,
      company_website: empty(input.company_website),
      company_socials: input.company_socials ?? null,
      // HR contact
      company_hr_name: empty(input.company_hr_name),
      company_hr_role: empty(input.company_hr_role),
      company_hr_email: empty(input.company_hr_email),
      company_hr_phone: empty(input.company_hr_phone),
      company_hr_preferred_contact: empty(input.company_hr_preferred_contact),
      company_hiring_roles: input.company_hiring_roles ?? [],
      company_hires_grads: input.company_hires_grads ?? null,
      // Employer brand
      company_workplace_photos: input.company_workplace_photos ?? [],
      company_benefits: input.company_benefits ?? [],
      company_working_hours: empty(input.company_working_hours),
      company_culture_blurb: empty(input.company_culture_blurb),
      // Academy
      company_academy_seats: input.company_academy_seats ?? null,
      company_academy_departments: input.company_academy_departments ?? [],
      company_academy_focus: input.company_academy_focus ?? [],
      // The logo doubles as the account avatar.
      avatar_url: empty(input.company_logo_url),
      // Completion gate (report BS-46): discoverable / can publish only when complete.
      profile_completed_at: complete
        ? (profile?.profile_completed_at ?? new Date().toISOString())
        : null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('[company-profile] save failed:', error.message)
    return { ok: false, error: 'save_failed' }
  }

  revalidatePath(`/${locale}/dashboard/profile`)
  // BS-90: the completion figure also lives in the dashboard shell (a layout),
  // so refresh the whole subtree — otherwise the sidebar keeps the old number.
  revalidatePath(`/${locale}/dashboard`, 'layout')
  return { ok: true, score, complete }
}
