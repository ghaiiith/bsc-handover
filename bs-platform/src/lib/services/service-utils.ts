import { SERVICE_CATEGORIES } from '@/lib/constants'
import type { OrderStatus } from '@/types'

export const SERVICES_PAGE_SIZE = 12

export type ServiceSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'best_rated'
  | 'most_orders'

export type DeliveryFilter = 'any' | '3' | '7' | '14'

export const orderStatusStyles: Record<OrderStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

const categoryGradients: Record<string, string> = {
  programming: 'from-blue-500 to-indigo-600',
  design: 'from-pink-500 to-rose-600',
  video: 'from-violet-500 to-purple-600',
  translation: 'from-teal-500 to-cyan-600',
  marketing: 'from-orange-500 to-amber-600',
  content: 'from-emerald-500 to-green-600',
  social: 'from-sky-500 to-blue-600',
  other: 'from-slate-500 to-gray-600',
}

export function getCategoryGradient(category: string): string {
  return categoryGradients[category] ?? categoryGradients.other
}

export function getCategoryLabel(
  category: string,
  locale: string
): string {
  const cat = SERVICE_CATEGORIES.find((c) => c.value === category)
  if (!cat) return category
  return locale === 'ar' ? cat.label : cat.labelEn
}

export function getOrderStatusLabel(
  status: OrderStatus,
  t: (key: string) => string
): string {
  const map: Record<OrderStatus, string> = {
    pending: t('status_pending'),
    in_progress: t('status_in_progress'),
    delivered: t('status_delivered'),
    completed: t('status_completed'),
    cancelled: t('status_cancelled'),
  }
  return map[status]
}

export function splitDescriptionBullets(description: string): string[] {
  return description
    .split(/\n/)
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter((line) => line.length > 5)
    .slice(0, 3)
}

export function canBuyerCancel(orderedAt: string): boolean {
  const orderTime = new Date(orderedAt).getTime()
  const oneHour = 60 * 60 * 1000
  return Date.now() - orderTime < oneHour
}

export function getDeliveryDeadline(orderedAt: string, deliveryDays: number): Date {
  const date = new Date(orderedAt)
  date.setDate(date.getDate() + deliveryDays)
  return date
}

export function getDaysUntilDelivery(
  orderedAt: string,
  deliveryDays: number
): number {
  const deadline = getDeliveryDeadline(orderedAt, deliveryDays)
  const diff = deadline.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
