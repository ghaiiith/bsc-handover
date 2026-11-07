import type {
  OnboardingField,
  OnboardingGoal,
  OnboardingLevel,
  OnboardingWeeklyHours,
} from '@/types/onboarding'

export const ONBOARDING_GOALS: Array<{
  value: OnboardingGoal
  icon: string
  labelKey: string
  descKey: string
}> = [
  { value: 'learn_skill', icon: '🎓', labelKey: 'goal_learn_skill', descKey: 'goal_learn_skill_desc' },
  { value: 'find_job', icon: '💼', labelKey: 'goal_find_job', descKey: 'goal_find_job_desc' },
  { value: 'improve_skills', icon: '📈', labelKey: 'goal_improve', descKey: 'goal_improve_desc' },
  { value: 'career_change', icon: '🚀', labelKey: 'goal_career_change', descKey: 'goal_career_change_desc' },
]

export const ONBOARDING_FIELDS: Array<{
  value: OnboardingField
  icon: string
  labelKey: string
}> = [
  { value: 'programming', icon: '💻', labelKey: 'field_programming' },
  { value: 'design', icon: '🎨', labelKey: 'field_design' },
  { value: 'data_ai', icon: '📊', labelKey: 'field_data_ai' },
  { value: 'mobile', icon: '📱', labelKey: 'field_mobile' },
  { value: 'marketing', icon: '📢', labelKey: 'field_marketing' },
  { value: 'video_media', icon: '🎬', labelKey: 'field_video_media' },
  { value: 'business', icon: '💰', labelKey: 'field_business' },
  { value: 'other', icon: '🌐', labelKey: 'field_other' },
]

export const ONBOARDING_LEVELS: Array<{
  value: OnboardingLevel
  icon: string
  labelKey: string
  descKey: string
}> = [
  { value: 'beginner', icon: '🌱', labelKey: 'level_beginner', descKey: 'level_beginner_desc' },
  { value: 'intermediate', icon: '🌿', labelKey: 'level_intermediate', descKey: 'level_intermediate_desc' },
  { value: 'advanced', icon: '🌳', labelKey: 'level_advanced', descKey: 'level_advanced_desc' },
]

export const ONBOARDING_TIME_OPTIONS: Array<{
  value: OnboardingWeeklyHours
  icon: string
  labelKey: string
  descKey: string
}> = [
  { value: 'minimal', icon: '⚡', labelKey: 'time_minimal', descKey: 'time_minimal_desc' },
  { value: 'light', icon: '🕐', labelKey: 'time_light', descKey: 'time_light_desc' },
  { value: 'moderate', icon: '🕓', labelKey: 'time_moderate', descKey: 'time_moderate_desc' },
  { value: 'intensive', icon: '🕖', labelKey: 'time_intensive', descKey: 'time_intensive_desc' },
]

/** Map onboarding field → course.category values */
/**
 * Report BS-26: onboarding stores `interests`, but the recommendation engine is
 * keyed on the `field` taxonomy. This maps one onto the other so the interests a
 * user picks actually drive their course recommendations.
 */
export const INTEREST_TO_FIELD: Record<string, OnboardingField> = {
  programming: 'programming',
  design: 'design',
  marketing: 'marketing',
  business: 'business',
  ai: 'data_ai',
  english: 'other',
  office_skills: 'business',
  freelancing: 'business',
  professional_skills: 'business',
  other: 'other',
}

/** Unique recommendation fields for a list of onboarding interests. */
export function interestsToFields(interests: string[] | null | undefined): OnboardingField[] {
  const fields = (interests ?? [])
    .map((i) => INTEREST_TO_FIELD[i])
    .filter((f): f is OnboardingField => Boolean(f))
  return [...new Set(fields)]
}

export const FIELD_TO_CATEGORIES: Record<OnboardingField, string[]> = {
  programming: ['programming'],
  design: ['design'],
  data_ai: ['data'],
  mobile: ['programming'],
  marketing: ['marketing'],
  video_media: ['video'],
  business: ['business'],
  other: ['other', 'language', 'programming', 'design', 'marketing', 'business', 'data', 'video'],
}
