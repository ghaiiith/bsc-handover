/** User-facing brand names — do not use for package/db identifiers. */
export const BRAND_FULL_NAME = 'Business Skills'
export const BRAND_SHORT_NAME = 'BS Platform'

/** Arabic-facing brand wordmarks (Arabic UI shows Arabic, not Latin). */
export const BRAND_FULL_NAME_AR = 'بزنس سكيلز'
export const BRAND_SHORT_NAME_AR = 'منصة بزنس سكيلز'

export function getBrandName(mode: 'full' | 'compact', locale: string): string {
  if (locale === 'ar') {
    return mode === 'compact' ? BRAND_SHORT_NAME_AR : BRAND_FULL_NAME_AR
  }
  return mode === 'compact' ? BRAND_SHORT_NAME : BRAND_FULL_NAME
}

export const BRAND_ORANGE = '#E57D17'
export const BRAND_ORANGE_HOVER = '#CC6F14'
export const BRAND_ORANGE_SOFT = '#FFF1E6'

export const BRAND_TEAL = '#045F6B'
export const BRAND_TEAL_HOVER = '#034F59'
export const BRAND_TEAL_SOFT = '#E6F4F5'

/** Traced BS mark SVG served from /public */
export const BRAND_LOGO_SVG_PATH = '/logo-traced.svg'

/**
 * Internal storage/session keys and npm package name may still use the legacy
 * `eduwork` prefix — intentional; do not rename without a migration plan.
 */
export const BRAND_SPLASH_STORAGE_KEY = 'bs_brand_splash_seen'
