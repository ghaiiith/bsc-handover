import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { formatPrice, formatNumber, formatCount, formatCompactNumber, normalizeMoneyAmount } from '@/lib/format-number'

export function formatDate(date: string, locale = 'ar'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(date))
}
