import type { UserRole } from '@/types'

const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set([
  'admin',
  'instructor',
  'company',
  'freelancer',
])

export function canOfferServices(role: UserRole | string | null | undefined): boolean {
  return role === 'freelancer' || role === 'instructor' || role === 'admin'
}

export function isPrivilegedRole(role: UserRole | string | null | undefined): boolean {
  return role != null && PRIVILEGED_ROLES.has(role as UserRole)
}

/**
 * AI *tools* (skill suggestions, community AI search) stay on the privileged
 * roles. This is NOT the gate for the chat assistants — see canUseAiChat.
 */
export function canAccessAiFeatures(role: UserRole | string | null | undefined): boolean {
  return isPrivilegedRole(role)
}

/**
 * The chat assistants — the floating platform chatbot and the in-lesson course
 * assistant — are open to every signed-in role, students included. They are
 * the people the assistants exist for: it answers "what should I learn next"
 * and "explain this lesson". Gating them behind privileged roles left students
 * staring at "available to company representatives, instructors, and admins
 * only" on a widget the layout shows to everybody.
 */
export function canUseAiChat(role: UserRole | string | null | undefined): boolean {
  return role != null && role !== ''
}

export function canPostJobs(role: UserRole | string | null | undefined): boolean {
  return role === 'admin' || role === 'company'
}
