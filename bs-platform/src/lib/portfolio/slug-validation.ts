/** Slug: 3–50 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen. */
export const PORTFOLIO_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

export function isValidPortfolioSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 50) return false
  if (slug.includes('--')) return false
  return PORTFOLIO_SLUG_REGEX.test(slug)
}

export function sanitizePortfolioSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}
