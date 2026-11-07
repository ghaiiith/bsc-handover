import type { UserRole } from '@/types'

/** Public marketing landing page — same for all roles. */
export function getPlatformHomePath(locale: string): string {
  return `/${locale}`
}

/** Default workspace after sign-in (not the public home). */
export function getDefaultWorkspacePath(
  locale: string,
  role?: UserRole | null
): string {
  if (role === 'admin') return `/${locale}/admin`
  return `/${locale}/dashboard`
}

/** @deprecated Use getDefaultWorkspacePath */
export function getPersonalizedHomePath(
  locale: string,
  role?: UserRole | null
): string {
  return getDefaultWorkspacePath(locale, role)
}
