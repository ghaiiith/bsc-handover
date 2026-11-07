import type { OnboardingPreferences } from '@/types/onboarding'
import type { CourseListItem } from '@/lib/courses/list-courses'
import { FIELD_TO_CATEGORIES } from '@/lib/onboarding/constants'

const EN_TO_AR: Array<[RegExp, string]> = [
  [/matches your skill in (.+)/i, 'يتوافق مع مهارتك في $1'],
  [/relevant to your goal of finding a job/i, 'مناسب لهدفك في إيجاد وظيفة'],
  [/matches your field of interest/i, 'يناسب مجال اهتمامك'],
  [/appropriate for your intermediate level/i, 'مناسب لمستواك المتوسط'],
  [/appropriate for your beginner level/i, 'مناسب لمستواك المبتدئ'],
  [/appropriate for your advanced level/i, 'مناسب لمستواك المتقدم'],
  [/matches your goal/i, 'يتوافق مع هدفك'],
  [/popular in your field/i, 'الأكثر شعبية في مجالك'],
]

export function translateReason(reason: string, locale: string): string {
  if (locale !== 'ar') return reason
  for (const [pattern, replacement] of EN_TO_AR) {
    if (pattern.test(reason)) return reason.replace(pattern, replacement)
  }
  if (/^[a-zA-Z]/.test(reason.trim())) {
    return 'موصى به بناءً على ملفك الشخصي'
  }
  return reason
}

export function buildCourseReason(
  course: CourseListItem,
  prefs: OnboardingPreferences,
  skills: string[],
  locale: string,
  fallbackPopular = false
): string {
  if (fallbackPopular) {
    return locale === 'ar' ? 'الأكثر شعبية في مجالك' : 'Popular in your field'
  }

  const isAr = locale === 'ar'
  const matchedSkill = skills.find((s) =>
    `${course.title} ${course.description ?? ''} ${course.category}`
      .toLowerCase()
      .includes(s.toLowerCase())
  )

  if (matchedSkill) {
    return isAr
      ? `يتوافق مع مهارتك في ${matchedSkill}`
      : `Matches your skill in ${matchedSkill}`
  }

  const fieldCategories = (prefs.fields ?? []).flatMap((f) => FIELD_TO_CATEGORIES[f] ?? [])
  if (fieldCategories.includes(course.category)) {
    return isAr ? 'يناسب مجال اهتمامك' : 'Matches your field of interest'
  }

  if (prefs.goal === 'find_job') {
    return isAr ? 'مناسب لهدفك في إيجاد وظيفة' : 'Relevant to your goal of finding a job'
  }

  if (prefs.level && course.level === prefs.level) {
    const levelLabels = {
      beginner: isAr ? 'المبتدئ' : 'beginner',
      intermediate: isAr ? 'المتوسط' : 'intermediate',
      advanced: isAr ? 'المتقدم' : 'advanced',
    }
    return isAr
      ? `مناسب لمستواك ${levelLabels[prefs.level]}`
      : `Appropriate for your ${prefs.level} level`
  }

  return isAr ? 'موصى به بناءً على ملفك الشخصي' : 'Recommended based on your profile'
}

export function buildBasedOnLabels(
  prefs: OnboardingPreferences,
  skills: string[],
  locale: string,
  fallback = false
): string[] {
  if (fallback) {
    return [locale === 'ar' ? 'الأكثر شعبية في مجالك' : 'Popular in your field']
  }
  const labels: string[] = []
  const isAr = locale === 'ar'
  if (skills.length > 0) labels.push(isAr ? 'مهاراتك' : 'Your skills')
  if (prefs.goal) labels.push(isAr ? 'هدفك' : 'Your goal')
  if (prefs.fields?.length) labels.push(isAr ? 'مجالك' : 'Your field')
  if (labels.length === 0) {
    labels.push(isAr ? 'ملفك الشخصي' : 'Your profile')
  }
  return labels
}
