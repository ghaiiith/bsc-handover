import type { UserRole } from '@/types'

/**
 * Server-enforced messaging permission (report BS-18):
 * a student may NOT start a conversation with another student; every other pair
 * (company↔student, student↔instructor, etc.) is allowed.
 */
export function canMessage(senderRole: UserRole, recipientRole: UserRole): boolean {
  if (senderRole === 'student' && recipientRole === 'student') return false
  return true
}
