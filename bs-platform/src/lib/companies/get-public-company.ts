import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Round 9 (BS-102): the public view of a company.
 *
 * Read through the service role (company_* columns are outside the
 * authenticated column grant) and then filtered to what may be public. HR
 * contact details, billing fields, and tax/registration numbers never leave
 * this module.
 */

export interface PublicCompany {
  id: string
  slug: string
  name: string
  nameAr: string | null
  logoUrl: string | null
  tagline: string | null
  description: string | null
  descriptionEn: string | null
  industry: string | null
  size: string | null
  type: string | null
  city: string | null
  governorate: string | null
  website: string | null
  socials: Record<string, string>
  yearFounded: number | null
  verified: boolean
  benefits: string[]
  cultureBlurb: string | null
  hiresGrads: boolean | null
  workplacePhotos: string[]
  memberSince: string
  jobs: Array<{
    id: string
    title: string
    titleAr: string | null
    city: string | null
    jobType: string | null
    isFeatured: boolean
    createdAt: string
  }>
}

async function loadPublicCompany(slug: string): Promise<PublicCompany | null> {
  const admin = createAdminClient()
  const { data: u } = await admin
    .from('users')
    .select(
      'id, role, is_active, created_at, company_slug, company_profile_public, profile_completed_at, company_name, company_name_ar, company_logo_url, company_tagline, company_description, company_description_en, company_industry, company_size, company_type, company_city, company_governorate, company_website, company_socials, company_year_founded, company_verification_status, company_benefits, company_culture_blurb, company_hires_grads, company_workplace_photos'
    )
    .eq('company_slug', slug)
    .maybeSingle()

  if (!u || u.role !== 'company' || u.is_active === false) return null
  if (u.company_profile_public === false) return null
  if (u.company_verification_status === 'blocked' || u.company_verification_status === 'rejected') return null
  if (!u.company_name && !u.company_name_ar) return null

  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, title_ar, city, job_type, is_featured, created_at')
    .eq('posted_by', u.id)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  const socialsRaw = u.company_socials
  const socials: Record<string, string> = {}
  if (socialsRaw && typeof socialsRaw === 'object') {
    for (const [k, v] of Object.entries(socialsRaw as Record<string, unknown>)) {
      if (typeof v === 'string' && /^https?:\/\//.test(v)) socials[k] = v
    }
  }

  return {
    id: u.id as string,
    slug,
    name: (u.company_name as string) || (u.company_name_ar as string),
    nameAr: (u.company_name_ar as string) ?? null,
    logoUrl: (u.company_logo_url as string) ?? null,
    tagline: (u.company_tagline as string) ?? null,
    description: (u.company_description as string) ?? null,
    descriptionEn: (u.company_description_en as string) ?? null,
    industry: (u.company_industry as string) ?? null,
    size: (u.company_size as string) ?? null,
    type: (u.company_type as string) ?? null,
    city: (u.company_city as string) ?? null,
    governorate: (u.company_governorate as string) ?? null,
    website: typeof u.company_website === 'string' && /^https?:\/\//.test(u.company_website) ? u.company_website : null,
    socials,
    yearFounded: typeof u.company_year_founded === 'number' ? u.company_year_founded : null,
    verified: u.company_verification_status === 'verified',
    benefits: Array.isArray(u.company_benefits) ? (u.company_benefits as string[]) : [],
    cultureBlurb: (u.company_culture_blurb as string) ?? null,
    hiresGrads: typeof u.company_hires_grads === 'boolean' ? u.company_hires_grads : null,
    workplacePhotos: Array.isArray(u.company_workplace_photos) ? (u.company_workplace_photos as string[]) : [],
    memberSince: u.created_at as string,
    jobs: (jobs ?? []).map((j) => ({
      id: j.id as string,
      title: j.title as string,
      titleAr: (j.title_ar as string) ?? null,
      city: (j.city as string) ?? null,
      jobType: (j.job_type as string) ?? null,
      isFeatured: Boolean(j.is_featured),
      createdAt: j.created_at as string,
    })),
  }
}

export function getPublicCompany(slug: string): Promise<PublicCompany | null> {
  return unstable_cache(() => loadPublicCompany(slug), ['public-company', slug], {
    revalidate: 300,
    tags: ['companies', `company-${slug}`],
  })()
}

/** Slug for a company user id — for linking from job cards. */
export async function getCompanySlugForUser(userId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('users')
    .select('company_slug, company_profile_public')
    .eq('id', userId)
    .maybeSingle()
  if (!data?.company_slug || data.company_profile_public === false) return null
  return data.company_slug as string
}
