import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { CheckCircle2 } from 'lucide-react'

export interface AttentionItem {
  id: string
  title: string
  subtitle?: string
  href: string
  icon: LucideIcon
  priority?: 'high' | 'normal'
  badge?: string
  timeLabel?: string
}

interface AttentionQueueProps {
  title: string
  items: AttentionItem[]
  emptyTitle: string
  emptyDescription: string
  emptyAction?: { href: string; label: string }
  viewAllHref?: string
  viewAllLabel?: string
}

export default function AttentionQueue({
  title,
  items,
  emptyTitle,
  emptyDescription,
  emptyAction,
  viewAllHref,
  viewAllLabel,
}: AttentionQueueProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {items.length > 0 && viewAllHref && viewAllLabel && (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-primary hover:underline"
          >
            {viewAllLabel}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="py-8"
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.slice(0, 5).map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                    item.priority === 'high' && 'border-s-2 border-s-orange-500'
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.timeLabel && (
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                      {item.timeLabel}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
