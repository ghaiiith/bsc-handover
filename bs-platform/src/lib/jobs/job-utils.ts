import { formatPrice } from '@/lib/utils'
import type { JobType } from '@/types'

export const JOBS_PAGE_SIZE = 10

export type JobSort = 'newest' | 'deadline' | 'salary_desc'

export const jobTypeStyles: Record<JobType, string> = {
  full_time: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  part_time: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  remote: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  hybrid: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  internship: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
}

export function parseDeadlineUtc(deadline: string): Date {
  const [year, month, day] = deadline.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  return date
}

export function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline) return false
  return Date.now() > parseDeadlineUtc(deadline).getTime()
}

export function getDaysRemaining(deadline?: string | null): number | null {
  if (!deadline) return null
  const end = parseDeadlineUtc(deadline)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getDeadlineUrgency(
  days: number | null
): 'none' | 'safe' | 'warning' | 'urgent' | 'passed' {
  if (days === null) return 'none'
  if (days < 0) return 'passed'
  if (days < 3) return 'urgent'
  if (days <= 7) return 'warning'
  return 'safe'
}

export function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', {
    numeric: 'auto',
  })

  if (diffDays === 0) return rtf.format(0, 'day')
  if (diffDays < 30) return rtf.format(-diffDays, 'day')
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return rtf.format(-diffMonths, 'month')
  const diffYears = Math.floor(diffMonths / 12)
  return rtf.format(-diffYears, 'year')
}

export function formatSalaryRange(
  job: {
    salary_min?: number | null
    salary_max?: number | null
    currency?: string
  },
  salaryTbdLabel: string
): string {
  const min = job.salary_min != null ? Number(job.salary_min) : null
  const max = job.salary_max != null ? Number(job.salary_max) : null
  const currency = job.currency ?? 'IQD'

  if (!min && !max) return salaryTbdLabel
  if (min && max) return `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`
  if (min) return `${formatPrice(min, currency)}+`
  if (max) return formatPrice(max, currency)
  return salaryTbdLabel
}

export function getJobTypeLabel(
  type: JobType,
  t: (key: string) => string
): string {
  const map: Record<JobType, string> = {
    full_time: t('full_time'),
    part_time: t('part_time'),
    remote: t('remote'),
    hybrid: t('hybrid'),
    internship: t('internship'),
  }
  return map[type]
}
