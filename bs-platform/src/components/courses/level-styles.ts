import type { CourseLevel } from '@/types'

export const levelStyles: Record<CourseLevel, string> = {
  beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

export function getLevelLabel(
  level: CourseLevel,
  t: (key: 'level_beginner' | 'level_intermediate' | 'level_advanced') => string
): string {
  return {
    beginner: t('level_beginner'),
    intermediate: t('level_intermediate'),
    advanced: t('level_advanced'),
  }[level]
}
