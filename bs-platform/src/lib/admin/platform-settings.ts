import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveRevenueAgreement } from '@/lib/revenue/agreements'

export interface PlatformSettings {
  commission_rate: string
  maintenance_mode: string
  support_email: string
  platform_name: string
  featured_course_ids: string
  // Report BS-24: the revenue-share notice shown on the service creation form,
  // editable by the admin (empty falls back to the built-in translation).
  service_revenue_notice_ar: string
  service_revenue_notice_en: string
  /** Report BS-34: daily AI CV generate/edit allowance per user. */
  cv_daily_allowance: string
  free_subscription_months: string
  ai_pro_features: string
  /** Report BS-70: JSON [{minSeats,discountPct}] for Company Academy bulk pricing. */
  academy_seat_tiers: string
  /** Report BS-73: JSON array of admin-managed homepage banner slides. */
  homepage_banners: string
  /** Report BS-74: JSON array of admin-picked homepage company ids/entries. */
  homepage_companies: string
  /** Growth-guide landing page: the PDF the lead magnet delivers. */
  growth_guide_pdf_url: string
  /** Growth-guide landing page: the consultation booking link. */
  growth_guide_booking_url: string
  /** Growth-guide landing page: the author's portrait. */
  growth_guide_author_photo: string
  // ---- Marketing & tracking (the marketing team's request, 2026-09) ----
  /** Google Tag Manager container id, e.g. GTM-XXXXXXX. Empty = not installed. */
  gtm_container_id: string
  /** GA4 measurement id, e.g. G-XXXXXXXXXX (loaded directly when GTM is absent). */
  ga4_measurement_id: string
  /** Google Search Console: content of the google-site-verification meta tag. */
  google_site_verification: string
  /** Meta (Facebook) Pixel id. */
  meta_pixel_id: string
  /** Meta domain verification meta-tag content. */
  meta_domain_verification: string
  /** Meta Conversions API access token — SERVER ONLY, never sent to a browser. */
  meta_capi_access_token: string
  /** Microsoft Clarity project id. */
  clarity_project_id: string
  /** Exit-intent lead pop-up on course/service pages: 'true' | 'false'. */
  lead_popup_enabled: string
  /** Pop-up copy (JSON {title_ar,title_en,body_ar,body_en}). */
  lead_popup_copy: string
  /** Where new leads are also sent instantly (comma-separated emails). Empty = none. */
  lead_notify_emails: string
}

export interface HomepageBanner {
  id: string
  image_url: string
  title?: string
  title_ar?: string
  text?: string
  text_ar?: string
  link?: string
  enabled: boolean
  order: number
}

export function parseHomepageBanners(raw: string | null | undefined): HomepageBanner[] {
  try {
    const arr = JSON.parse(raw || '[]')
    if (!Array.isArray(arr)) return []
    return arr
      .filter((b) => b && typeof b.image_url === 'string' && b.image_url)
      .map((b, i) => ({
        id: String(b.id ?? i),
        image_url: b.image_url,
        title: b.title ?? '',
        title_ar: b.title_ar ?? '',
        text: b.text ?? '',
        text_ar: b.text_ar ?? '',
        link: b.link ?? '',
        enabled: b.enabled !== false,
        order: Number(b.order ?? i),
      }))
      .sort((a, b) => a.order - b.order)
  } catch {
    return []
  }
}

const DEFAULTS: PlatformSettings = {
  commission_rate: '',
  maintenance_mode: 'false',
  support_email: 'support@bs-platform.com',
  platform_name: 'Business Skills',
  featured_course_ids: '[]',
  service_revenue_notice_ar: '',
  service_revenue_notice_en: '',
  cv_daily_allowance: '2',
  free_subscription_months: '0',
  ai_pro_features: '[]',
  academy_seat_tiers:
    '[{"minSeats":5,"discountPct":10},{"minSeats":10,"discountPct":15},{"minSeats":20,"discountPct":20},{"minSeats":50,"discountPct":30}]',
  homepage_banners: '[]',
  homepage_companies: '[]',
  growth_guide_pdf_url: '',
  growth_guide_booking_url: '',
  growth_guide_author_photo: '',
  gtm_container_id: '',
  ga4_measurement_id: '',
  google_site_verification: '',
  meta_pixel_id: '',
  meta_domain_verification: '',
  meta_capi_access_token: '',
  clarity_project_id: '',
  lead_popup_enabled: 'false',
  lead_popup_copy: '',
  lead_notify_emails: '',
}

async function fetchSettingsFromDb(): Promise<PlatformSettings> {
  const admin = createAdminClient()
  const { data } = await admin.from('platform_settings').select('key, value')

  const settings = { ...DEFAULTS }
  ;(data ?? []).forEach((row) => {
    const key = row.key as keyof PlatformSettings
    if (key in settings) {
      settings[key] = row.value as string
    }
  })
  return settings
}

export const getPlatformSettings = unstable_cache(
  fetchSettingsFromDb,
  ['platform-settings'],
  { revalidate: 60, tags: ['platform-settings'] }
)

export function parseFeaturedCourseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Admin-editable service revenue-share notice for the given locale (BS-24). */
export async function getServiceRevenueNotice(locale: string): Promise<string> {
  const settings = await getPlatformSettings()
  return locale === 'ar'
    ? settings.service_revenue_notice_ar
    : settings.service_revenue_notice_en
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getPlatformSettings()
  return settings.maintenance_mode === 'true'
}

export interface CommissionSplit {
  adminPct: number
  instructorPct: number
}

/** Sensible fallback when the admin has not set a platform commission rate. */
const FALLBACK_PLATFORM_PERCENTAGE = 30

/**
 * Report BS-55/56/57: the platform-wide default revenue split, taken from the
 * admin-editable `commission_rate` setting (the platform's percentage). This is
 * the split applied to any instructor who does not yet have a custom agreement,
 * so discounts, earnings previews and payouts all work out of the box (e.g. a
 * 30% platform rate → the instructor keeps 70%). Previously the code assumed no
 * default and every un-provisioned instructor hit `no_revenue_agreement`, which
 * surfaced as "Internal error" on coupon creation and IQD 0 earnings.
 */
export async function getDefaultCommissionSplit(): Promise<CommissionSplit> {
  const settings = await getPlatformSettings()
  const raw = Number(settings.commission_rate)
  const platformPct =
    Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : FALLBACK_PLATFORM_PERCENTAGE
  return { adminPct: platformPct, instructorPct: 100 - platformPct }
}

/**
 * Revenue split for an instructor: their active custom agreement when one exists,
 * otherwise the platform default (never null — see getDefaultCommissionSplit).
 */
export async function getInstructorCommissionSplit(
  instructorId: string
): Promise<CommissionSplit> {
  const agreement = await getActiveRevenueAgreement(instructorId)
  if (!agreement) return getDefaultCommissionSplit()
  return {
    adminPct: agreement.platform_percentage,
    instructorPct: agreement.instructor_percentage,
  }
}

/** Batch variant — only instructors with active agreements are included. */
export async function getInstructorCommissionSplits(
  instructorIds: string[]
): Promise<Map<string, CommissionSplit>> {
  const map = new Map<string, CommissionSplit>()
  const uniqueIds = [...new Set(instructorIds.filter(Boolean))]
  if (uniqueIds.length === 0) return map

  const admin = createAdminClient()
  const { data } = await admin
    .from('instructor_revenue_agreements')
    .select('instructor_id, platform_percentage, instructor_percentage')
    .in('instructor_id', uniqueIds)
    .eq('status', 'active')

  for (const row of data ?? []) {
    map.set(row.instructor_id as string, {
      adminPct: Number(row.platform_percentage),
      instructorPct: Number(row.instructor_percentage),
    })
  }
  return map
}

/**
 * Resolve the split for a course. Report BS-78: a per-course admin override
 * (`courses.platform_commission_pct`) wins over the instructor's agreement, which
 * in turn wins over the platform default.
 */
export async function getCourseCommissionSplit(
  courseId: string
): Promise<CommissionSplit | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('courses')
    .select('instructor_id, platform_commission_pct')
    .eq('id', courseId)
    .maybeSingle()

  const override = data?.platform_commission_pct
  if (override !== null && override !== undefined) {
    const platformPct = Number(override)
    return { adminPct: platformPct, instructorPct: 100 - platformPct }
  }

  const instructorId = data?.instructor_id as string | undefined
  if (!instructorId) return null
  return getInstructorCommissionSplit(instructorId)
}

/** @deprecated Global default removed — use per-instructor agreements. */
export async function getCommissionSplit(): Promise<CommissionSplit | null> {
  return null
}
