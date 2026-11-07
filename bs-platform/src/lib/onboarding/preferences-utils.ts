import type { OnboardingPreferences } from '@/types/onboarding'

export function parsePreferences(raw: unknown): OnboardingPreferences {
  if (!raw || typeof raw !== 'object') return {}
  return raw as OnboardingPreferences
}

export function isPreferencesEmpty(prefs: OnboardingPreferences): boolean {
  if (!prefs || Object.keys(prefs).length === 0) return true
  if (prefs.skipped) return true
  return !prefs.completed_at
}

export function hasCompletedOnboarding(prefs: OnboardingPreferences): boolean {
  return Boolean(prefs.completed_at && !prefs.skipped)
}
