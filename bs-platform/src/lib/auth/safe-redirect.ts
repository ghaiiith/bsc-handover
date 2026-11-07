import type { UserRole } from '@/types'

const BLOCKED_NEXT_PREFIXES = [
  '/login',
  '/register',
  '/onboarding',
  '/account-suspended',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

/** Validate post-login `next` redirect — internal paths only. */
export function isSafeNextPath(path: string | null | undefined, locale: string): boolean {
  if (!path || typeof path !== 'string') return false
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return false
  if (trimmed.startsWith('//')) return false
  if (trimmed.includes('://')) return false
  if (trimmed.includes('\\')) return false

  const withoutLocale = trimmed.replace(/^\/(ar|en)/, '') || '/'
  if (BLOCKED_NEXT_PREFIXES.some((p) => withoutLocale === p || withoutLocale.startsWith(`${p}/`))) {
    return false
  }

  if (!trimmed.startsWith(`/${locale}`) && !trimmed.match(/^\/(ar|en)(\/|$)/)) {
    return false
  }

  return true
}

export function normalizeNextPath(path: string, locale: string): string {
  if (path.startsWith(`/${locale}`)) return path
  if (path.match(/^\/(ar|en)\//)) return path
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`
}

export function canAccessPathWithRole(path: string, role: UserRole): boolean {
  const withoutLocale = path.replace(/^\/(ar|en)/, '') || '/'
  if (withoutLocale.startsWith('/admin')) return role === 'admin'
  if (withoutLocale.startsWith('/instructor')) {
    return role === 'instructor' || role === 'admin'
  }
  return true
}
