import type { User } from '@/types'

export const PROFILE_UPDATED_EVENT = 'eduwork:profile-updated'

export function dispatchProfileUpdated(profile: User) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: profile }))
}

export function mergeProfileUpdate(current: User | null, update: User): User {
  if (!current) return update
  return { ...current, ...update }
}
