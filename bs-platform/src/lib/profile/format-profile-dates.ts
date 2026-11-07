import { ENGLISH_MONTHS } from '@/lib/profile/profile-constants'

export function formatExperienceDateRange(
  startDate: string,
  endDate: string | null,
  isCurrent: boolean,
  presentLabel: string
): string {
  const start = formatYearMonth(startDate)
  if (isCurrent || !endDate) {
    return `${start} — ${presentLabel}`
  }
  return `${start} — ${formatYearMonth(endDate)}`
}

export function formatYearMonth(value: string): string {
  const [year, month] = value.split('-')
  const monthIndex = parseInt(month, 10) - 1
  const monthLabel = ENGLISH_MONTHS[monthIndex] ?? month
  return `${monthLabel} ${year}`
}

export function parseYearMonth(value: string): { month: string; year: string } {
  const [year, month] = value.split('-')
  return { year: year ?? '2024', month: month ?? '01' }
}

export function buildYearMonth(year: string, month: string): string {
  return `${year}-${month.padStart(2, '0')}`
}

export function sortExperience<T extends { start_date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.start_date.localeCompare(a.start_date))
}

export function sortEducation<T extends { start_year: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.start_year - a.start_year)
}
