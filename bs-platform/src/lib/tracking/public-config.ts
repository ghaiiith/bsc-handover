import 'server-only'

import { getPlatformSettings } from '@/lib/admin/platform-settings'

/**
 * Marketing request (2026-09): the tracking ids the browser may know.
 *
 * Deliberately a whitelist. The Meta CAPI access token lives in the same
 * settings row but is NOT here and must never be — it authorises server-side
 * event posting on the ad account.
 */
export interface PublicTrackingConfig {
  gtmId: string | null
  ga4Id: string | null
  metaPixelId: string | null
  clarityId: string | null
  googleSiteVerification: string | null
  metaDomainVerification: string | null
}

const clean = (v: string | undefined, re: RegExp): string | null => {
  const t = (v ?? '').trim()
  return t && re.test(t) ? t : null
}

export async function getPublicTrackingConfig(): Promise<PublicTrackingConfig> {
  const s = await getPlatformSettings()
  return {
    gtmId: clean(s.gtm_container_id, /^GTM-[A-Z0-9]{4,12}$/i),
    ga4Id: clean(s.ga4_measurement_id, /^G-[A-Z0-9]{6,14}$/i),
    metaPixelId: clean(s.meta_pixel_id, /^\d{8,20}$/),
    clarityId: clean(s.clarity_project_id, /^[a-z0-9]{6,20}$/i),
    googleSiteVerification: clean(s.google_site_verification, /^[A-Za-z0-9_-]{10,120}$/),
    metaDomainVerification: clean(s.meta_domain_verification, /^[A-Za-z0-9_-]{10,120}$/),
  }
}
