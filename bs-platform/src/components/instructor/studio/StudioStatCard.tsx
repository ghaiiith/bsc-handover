import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StudioStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  className?: string
}

export default function StudioStatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: StudioStatCardProps) {
  return (
    <div className={cn('edu-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold num-en tabular-nums">{value}</p>
          {trend && <p className="mt-1 text-xs text-brand-green">{trend}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  )
}
