import { z } from 'zod'

/**
 * Full company profile (Company-Profile-Fields spec). The form saves partial
 * data freely; "completion" is measured against the REQUIRED fields only, and
 * drives the publish gate + discoverability (report BS-46). Billing is required
 * only at first purchase, so it is NOT part of completion.
 */

const optStr = z.string().trim().max(2000).optional().default('')
const optEmail = z.string().trim().email().max(160).or(z.literal('')).optional().default('')

export const companyProfileSchema = z.object({
  // Identity
  company_name: z.string().trim().max(160).optional().default(''),
  company_name_ar: z.string().trim().max(160).optional().default(''),
  company_logo_url: z.string().trim().max(500).optional().default(''),
  company_type: z.string().trim().max(40).optional().default(''),
  company_industry: z.string().trim().max(60).optional().default(''),
  company_size: z.string().trim().max(20).optional().default(''),
  company_governorate: z.string().trim().max(40).optional().default(''),
  company_city: z.string().trim().max(120).optional().default(''),

  // About
  company_description: z.string().trim().max(2000).optional().default(''),
  company_description_en: z.string().trim().max(2000).optional().default(''),
  company_tagline: z.string().trim().max(80).optional().default(''),
  company_year_founded: z.number().int().min(1900).max(2100).nullable().optional(),
  company_website: z.string().trim().max(200).optional().default(''),
  company_socials: z
    .object({
      linkedin: optStr,
      instagram: optStr,
      facebook: optStr,
    })
    .partial()
    .optional(),

  // HR contact
  company_hr_name: z.string().trim().max(120).optional().default(''),
  company_hr_role: z.string().trim().max(120).optional().default(''),
  company_hr_email: optEmail,
  company_hr_phone: z.string().trim().max(40).optional().default(''),
  company_hr_preferred_contact: z.string().trim().max(20).optional().default(''),
  company_hiring_roles: z.array(z.string().trim().max(80)).max(30).optional().default([]),
  company_hires_grads: z.boolean().nullable().optional(),

  // Employer brand
  company_workplace_photos: z.array(z.string().trim().max(500)).max(10).optional().default([]),
  company_benefits: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  company_working_hours: z.string().trim().max(120).optional().default(''),
  company_culture_blurb: z.string().trim().max(1000).optional().default(''),

  // Academy
  company_academy_seats: z.number().int().min(0).max(100000).nullable().optional(),
  company_academy_departments: z.array(z.string().trim().max(80)).max(30).optional().default([]),
  company_academy_focus: z.array(z.string().trim().max(80)).max(30).optional().default([]),
})

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>

/** Required fields for completion (from the spec's "Required = Yes"). */
const REQUIRED_FIELDS: (keyof CompanyProfileInput)[] = [
  'company_name',
  'company_name_ar',
  'company_logo_url',
  'company_type',
  'company_industry',
  'company_size',
  'company_governorate',
  'company_city',
  'company_hr_name',
  'company_hr_role',
]

const MIN_DESCRIPTION = 100

export function getMissingCompanyFields(input: Partial<CompanyProfileInput>): string[] {
  const missing: string[] = REQUIRED_FIELDS.filter((f) => !String(input[f] ?? '').trim())
  // Description counts only when it is substantial (>= 100 chars).
  if (String(input.company_description ?? '').trim().length < MIN_DESCRIPTION) {
    missing.push('company_description')
  }
  // Verified work email is required.
  if (!String(input.company_hr_email ?? '').trim()) missing.push('company_hr_email')
  return missing
}

export function isCompanyProfileComplete(input: Partial<CompanyProfileInput>): boolean {
  return getMissingCompanyFields(input).length === 0
}

export function calculateCompanyProfileScore(input: Partial<CompanyProfileInput>): number {
  const total = REQUIRED_FIELDS.length + 2 // + description + hr_email
  const missing = getMissingCompanyFields(input).length
  return Math.round(((total - missing) / total) * 100)
}
