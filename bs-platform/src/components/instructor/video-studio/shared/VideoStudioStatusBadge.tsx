import { cn } from '@/lib/utils'

export interface VideoStudioStatusBadgeProps {
  status?: string | null
}

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  encrypted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  processing: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  uploading: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  draft: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/15 text-destructive',
}

export default function VideoStudioStatusBadge({ status }: VideoStudioStatusBadgeProps) {
  const normalized = (status ?? 'unknown').toLowerCase()
  const style = STATUS_STYLES[normalized] ?? 'bg-muted text-muted-foreground'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        style
      )}
    >
      {status ?? '—'}
    </span>
  )
}
