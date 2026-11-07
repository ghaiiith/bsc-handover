import type { UserRole } from '@/types'

/** Role used for dashboard sidebar navigation. */
export function getDashboardNavRole(role: UserRole | string | undefined): UserRole {
  if (
    role === 'admin' ||
    role === 'instructor' ||
    role === 'company' ||
    role === 'freelancer'
  ) {
    return role
  }
  return 'student'
}
