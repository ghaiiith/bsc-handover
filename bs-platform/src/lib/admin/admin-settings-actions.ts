'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseFeaturedCourseIds } from '@/lib/admin/platform-settings'

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

async function upsertSetting(key: string, value: string): Promise<string | null> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('platform_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  // Report BS-73: a failed save must NOT be reported to the admin as success.
  if (error) {
    console.error('[admin/settings] upsert failed:', key, error.message)
    return error.message
  }
  return null
}

export async function updateCommissionRate(rate: number, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (rate < 1 || rate > 50) return { error: 'invalid_rate' }

  await upsertSetting('commission_rate', String(rate))
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

export async function updateCommissionSplit(
  adminPct: number,
  instructorPct: number,
  locale: string
) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  if (
    !Number.isFinite(adminPct) ||
    !Number.isFinite(instructorPct) ||
    adminPct < 0 ||
    adminPct > 100 ||
    instructorPct < 0 ||
    instructorPct > 100
  ) {
    return { error: 'invalid_split' }
  }

  if (adminPct + instructorPct !== 100) {
    return { error: 'split_must_sum_100' }
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('set_commission_split', {
    p_admin_pct: adminPct,
    p_instructor_pct: instructorPct,
  })

  if (error) {
    return { error: 'split_must_sum_100' }
  }

  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

export async function updateMaintenanceMode(enabled: boolean, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  await upsertSetting('maintenance_mode', enabled ? 'true' : 'false')
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

export async function updatePlatformInfo(
  data: { support_email: string; platform_name: string },
  locale: string
) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  await upsertSetting('support_email', data.support_email.trim())
  await upsertSetting('platform_name', data.platform_name.trim())
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

export async function updateServiceRevenueNotice(
  data: { ar: string; en: string },
  locale: string
) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  await upsertSetting('service_revenue_notice_ar', data.ar.trim().slice(0, 1000))
  await upsertSetting('service_revenue_notice_en', data.en.trim().slice(0, 1000))
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

export async function updateCvDailyAllowance(allowance: number, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (!Number.isFinite(allowance) || allowance < 0 || allowance > 100) {
    return { error: 'invalid_allowance' }
  }
  await upsertSetting('cv_daily_allowance', String(Math.floor(allowance)))
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

export async function addFeaturedCourse(courseId: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'featured_course_ids')
    .maybeSingle()

  const ids = parseFeaturedCourseIds(setting?.value ?? '[]')
  if (ids.length >= 6) return { error: 'max_featured' }
  if (ids.includes(courseId)) return { error: 'already_featured' }

  await upsertSetting('featured_course_ids', JSON.stringify([...ids, courseId]))
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  revalidatePath(`/${locale}`)
  return { success: true }
}

export async function removeFeaturedCourse(courseId: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'featured_course_ids')
    .maybeSingle()

  const ids = parseFeaturedCourseIds(setting?.value ?? '[]').filter((id) => id !== courseId)
  await upsertSetting('featured_course_ids', JSON.stringify(ids))
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  revalidatePath(`/${locale}`)
  return { success: true }
}

export async function searchPublishedCourses(q: string) {
  if (!(await verifyAdmin())) return []

  const admin = createAdminClient()
  const term = `%${sanitizeSearchTerm(q)}%`
  const { data } = await admin
    .from('courses')
    .select('id, title, title_ar, thumbnail_url')
    .eq('status', 'published')
    .or(`title.ilike.${term},title_ar.ilike.${term}`)
    .limit(10)

  return data ?? []
}

// ---- Report BS-49: which AI features are gated behind Pro ----

const AI_FEATURE_KEYS = ['ai_cv', 'ai_course', 'ai_matching'] as const

export async function updateAiProFeatures(features: string[], locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const clean = Array.from(
    new Set(features.filter((f) => (AI_FEATURE_KEYS as readonly string[]).includes(f)))
  )
  await upsertSetting('ai_pro_features', JSON.stringify(clean))
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true }
}

/** Grant (months>0) or revoke (months=0) Pro for one user, by email. */
export async function grantUserPro(email: string, months: number, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const normalized = email.trim().toLowerCase()
  const { data: user } = await admin
    .from('users')
    .select('id, pro_until')
    .eq('email', normalized)
    .maybeSingle()
  if (!user) return { error: 'user_not_found' }

  let proUntil: string | null = null
  if (months > 0) {
    const base =
      user.pro_until && new Date(user.pro_until as string).getTime() > Date.now()
        ? new Date(user.pro_until as string)
        : new Date()
    base.setMonth(base.getMonth() + Math.floor(months))
    proUntil = base.toISOString()
  }
  const { error } = await admin.from('users').update({ pro_until: proUntil }).eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath(`/${locale}/admin/settings`)
  return { success: true, proUntil }
}

// ── Report BS-73/74: admin-managed homepage banner slides + picked companies ──

/** Persist the homepage banner slides (validated JSON array). */
export async function saveHomepageBanners(
  banners: unknown,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (!Array.isArray(banners)) return { error: 'invalid' }
  // Report BS-73: a slide with no image silently vanishes on read — reject it
  // here so the admin is told instead of losing the entry.
  if (banners.some((b) => !(b as { image_url?: string })?.image_url)) {
    return { error: 'banner_image_required' }
  }
  const bannerErr = await upsertSetting('homepage_banners', JSON.stringify(banners))
  if (bannerErr) return { error: bannerErr }
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  revalidatePath(`/${locale}`)
  return { success: true }
}

/** Persist the admin-picked homepage companies (validated JSON array). */
export async function saveHomepageCompanies(
  companies: unknown,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (!Array.isArray(companies)) return { error: 'invalid' }
  const companyErr = await upsertSetting('homepage_companies', JSON.stringify(companies))
  if (companyErr) return { error: companyErr }
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  revalidatePath(`/${locale}`)
  return { success: true }
}

// Must match the storage bucket's allowed types/size or the upload 400s.
const HOMEPAGE_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Upload a homepage banner / company logo image (admin only). */
export async function uploadHomepageImage(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  if (!(await verifyAdmin())) return { url: null, error: 'unauthorized' }
  const file = formData.get('file')
  if (!(file instanceof File)) return { url: null, error: 'invalid_file' }
  if (!HOMEPAGE_IMG_TYPES.includes(file.type)) return { url: null, error: 'invalid_type' }
  if (file.size > 2 * 1024 * 1024) return { url: null, error: 'file_too_large' }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `homepage/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const admin = createAdminClient()
    const { error } = await admin.storage
      .from('service-portfolio')
      .upload(path, buffer, { upsert: false, contentType: file.type })
    if (error) return { url: null, error: error.message }
    const { data } = admin.storage.from('service-portfolio').getPublicUrl(path)
    return { url: data.publicUrl }
  } catch {
    return { url: null, error: 'upload_failed' }
  }
}


/**
 * Report BS-70/80: the Company Academy seat tiers must be configurable BY THE
 * ADMINISTRATOR, not hand-edited in the database. Stored as
 * platform_settings.academy_seat_tiers = [{minSeats, discountPct}].
 */
export async function saveAcademySeatTiers(
  tiers: unknown,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (!Array.isArray(tiers)) return { error: 'invalid' }

  const clean = tiers
    .map((t) => ({
      minSeats: Number((t as { minSeats?: unknown }).minSeats),
      discountPct: Number((t as { discountPct?: unknown }).discountPct),
    }))
    .filter((t) => Number.isFinite(t.minSeats) && Number.isFinite(t.discountPct))
  if (clean.some((t) => t.minSeats < 1 || t.discountPct < 0 || t.discountPct > 100)) {
    return { error: 'invalid_tier' }
  }
  clean.sort((a, b) => a.minSeats - b.minSeats)

  const err = await upsertSetting('academy_seat_tiers', JSON.stringify(clean))
  if (err) return { error: err }
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  revalidatePath(`/${locale}/dashboard/academy`)
  return { success: true }
}

/** Growth-guide landing page: the PDF, the booking link and the author photo. */
export async function saveGrowthGuideSettings(
  input: { pdfUrl: string; bookingUrl: string; authorPhoto: string },
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const isUrlOrEmpty = (v: string) => !v || /^https?:\/\/.+/i.test(v)
  if (![input.pdfUrl, input.bookingUrl, input.authorPhoto].every(isUrlOrEmpty)) {
    return { error: 'invalid_url' }
  }

  for (const [key, value] of [
    ['growth_guide_pdf_url', input.pdfUrl.trim()],
    ['growth_guide_booking_url', input.bookingUrl.trim()],
    ['growth_guide_author_photo', input.authorPhoto.trim()],
  ] as const) {
    const err = await upsertSetting(key, value)
    if (err) return { error: err }
  }

  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/settings`)
  revalidatePath(`/${locale}/growth-guide`)
  return { success: true }
}

// ---- Marketing & tracking (the marketing team's request, 2026-09) ----

export interface MarketingSettingsInput {
  gtm_container_id: string
  ga4_measurement_id: string
  google_site_verification: string
  meta_pixel_id: string
  meta_domain_verification: string
  /** Empty string = keep the stored token; the form never shows it back. */
  meta_capi_access_token?: string
  clarity_project_id: string
  lead_popup_enabled: boolean
  lead_popup_copy: { title_ar?: string; title_en?: string; body_ar?: string; body_en?: string }
  lead_notify_emails: string
}

/**
 * Save every tracking id from one form. Each value is validated against the
 * shape the vendor uses, so a paste of the wrong thing is refused with a
 * field name rather than silently breaking every page's <head>.
 */
export async function saveMarketingSettings(
  input: MarketingSettingsInput,
  locale: string
): Promise<{ success?: boolean; error?: string; field?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const checks: Array<[keyof MarketingSettingsInput, RegExp]> = [
    ['gtm_container_id', /^(GTM-[A-Z0-9]{4,12})?$/i],
    ['ga4_measurement_id', /^(G-[A-Z0-9]{6,14})?$/i],
    ['google_site_verification', /^([A-Za-z0-9_-]{10,120})?$/],
    ['meta_pixel_id', /^(\d{8,20})?$/],
    ['meta_domain_verification', /^([A-Za-z0-9_-]{10,120})?$/],
    ['clarity_project_id', /^([a-z0-9]{6,20})?$/i],
  ]
  for (const [field, re] of checks) {
    const v = String(input[field] ?? '').trim()
    if (!re.test(v)) return { error: 'invalid_value', field }
  }
  const emails = input.lead_notify_emails
    .split(/[,\s]+/)
    .map((e) => e.trim())
    .filter(Boolean)
  if (emails.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) {
    return { error: 'invalid_value', field: 'lead_notify_emails' }
  }

  const writes: Array<[string, string]> = [
    ['gtm_container_id', input.gtm_container_id.trim()],
    ['ga4_measurement_id', input.ga4_measurement_id.trim()],
    ['google_site_verification', input.google_site_verification.trim()],
    ['meta_pixel_id', input.meta_pixel_id.trim()],
    ['meta_domain_verification', input.meta_domain_verification.trim()],
    ['clarity_project_id', input.clarity_project_id.trim()],
    ['lead_popup_enabled', input.lead_popup_enabled ? 'true' : 'false'],
    ['lead_popup_copy', JSON.stringify(input.lead_popup_copy ?? {})],
    ['lead_notify_emails', emails.join(',')],
  ]
  if (input.meta_capi_access_token && input.meta_capi_access_token.trim()) {
    writes.push(['meta_capi_access_token', input.meta_capi_access_token.trim()])
  }

  for (const [k, v] of writes) {
    const err = await upsertSetting(k, v)
    if (err) return { error: err }
  }

  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/marketing`)
  // The tracking scripts live in the locale layout — refresh every page.
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function clearMetaCapiToken(locale: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const err = await upsertSetting('meta_capi_access_token', '')
  if (err) return { error: err }
  revalidateTag('platform-settings', 'max')
  revalidatePath(`/${locale}/admin/marketing`)
  return { success: true }
}
