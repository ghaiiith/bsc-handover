'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

const statusStyles: Record<Job['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  closed: 'bg-muted text-muted-foreground',
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

interface JobStatusBadgeProps {
  status: Job['status']
  className?: string
}

export default function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const t = useTranslations('jobs')

  const label = {
    active: t('job_status_active'),
    closed: t('job_status_closed'),
    draft: t('job_status_draft'),
    expired: t('job_status_expired'),
  }[status]

  return (
    <Badge className={cn(statusStyles[status], className)} variant="secondary">
      {label}
    </Badge>
  )
}
