import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export interface QuickActionItem {
  href: string
  label: string
  icon: LucideIcon
  variant?: 'default' | 'outline'
  external?: boolean
}

interface QuickActionsProps {
  title: string
  actions: QuickActionItem[]
  className?: string
}

export default function QuickActions({ title, actions, className }: QuickActionsProps) {
  if (actions.length === 0) return null

  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              className={cn(
                buttonVariants({
                  variant: action.variant ?? 'outline',
                  size: 'sm',
                }),
                'gap-2 min-h-11 justify-center sm:min-h-0 sm:justify-start'
              )}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
