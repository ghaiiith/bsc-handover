import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export function formatPrice(price: number, currency = 'IQD'): string {
  if (price === 0) return 'Free'
  return `${price.toLocaleString()} ${currency}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function statusColor(status: string): string {
  if (status === 'failed') return 'text-destructive'
  if (status === 'completed') return 'text-success'
  if (status.includes('processing') || status.includes('uploading') || status.includes('generating'))
    return 'text-warning'
  return 'text-muted-foreground'
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'rejected':
      return 'bg-rose-100 text-rose-800'
    case 'archived':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
