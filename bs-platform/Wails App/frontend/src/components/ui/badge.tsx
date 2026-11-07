import { cn, statusBadgeClass } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-input text-foreground',
  destructive: 'bg-destructive text-white',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export function CourseStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', statusBadgeClass(status))}>
      {status}
    </span>
  )
}

export function VideoStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ready'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'failed'
        ? 'bg-rose-100 text-rose-800'
        : status === 'uploading' || status === 'processing'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', cls)}>
      {status}
    </span>
  )
}
