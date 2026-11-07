'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CourseStatus } from '@/types'

const statusStyles: Record<CourseStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

interface CourseStatusBadgeProps {
  status: CourseStatus
  className?: string
}

export default function CourseStatusBadge({
  status,
  className,
}: CourseStatusBadgeProps) {
  const t = useTranslations('instructor')

  const label = {
    draft: t('status_draft'),
    pending: t('status_pending'),
    published: t('status_published'),
    rejected: t('status_rejected'),
  }[status]

  return (
    <Badge className={cn(statusStyles[status], className)} variant="secondary">
      {label}
    </Badge>
  )
}
