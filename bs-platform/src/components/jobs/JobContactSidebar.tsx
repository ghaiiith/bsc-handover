'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import JobContactSection from '@/components/jobs/JobContactSection'
import {
  getDaysRemaining,
  getDeadlineUrgency,
  isDeadlinePassed,
} from '@/lib/jobs/job-utils'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

interface JobContactSidebarProps {
  locale: string
  job: Job
}

export default function JobContactSidebar({ locale, job }: JobContactSidebarProps) {
  const t = useTranslations('jobs')
  const [copied, setCopied] = useState(false)

  const isAr = locale === 'ar'
  const title = isAr ? job.title_ar : job.title
  const deadlinePassed = isDeadlinePassed(job.deadline)
  const daysRemaining = getDaysRemaining(job.deadline)
  const urgency = getDeadlineUrgency(daysRemaining)

  const urgencyClass = {
    none: 'text-muted-foreground',
    safe: 'text-emerald-600',
    warning: 'text-amber-600',
    urgent: 'text-destructive',
    passed: 'text-destructive',
  }[urgency]

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success(t('link_copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('load_error'))
    }
  }

  return (
    <Card className="lg:sticky lg:top-20 shadow-md">
      <CardContent className="space-y-5 p-5">
        <div>
          <p className="font-bold">{job.company_name}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{title}</p>
        </div>

        {job.deadline && (
          <div className={cn('text-sm font-medium', urgencyClass)}>
            {deadlinePassed
              ? t('deadline_passed')
              : t('days_remaining', { count: daysRemaining ?? 0 })}
          </div>
        )}

        <JobContactSection job={job} locale={locale} variant="sidebar" />

        <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
          <Link2 className="h-4 w-4" />
          {copied ? t('link_copied') : t('share')}
        </Button>
      </CardContent>
    </Card>
  )
}
