'use client'

import { trackEvent } from '@/lib/tracking/track-event'

import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { isDeadlinePassed } from '@/lib/jobs/job-utils'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

interface JobMobileStickyBarProps {
  job: Job
}

type ApplyAction = {
  href: string
  labelKey: 'apply_via_link' | 'contact_email' | 'contact_whatsapp' | 'contact_phone'
  external?: boolean
}

function getPrimaryApplyAction(job: Job): ApplyAction | null {
  if (job.contact_link) {
    return { href: job.contact_link, labelKey: 'apply_via_link', external: true }
  }
  if (job.contact_email) {
    return { href: `mailto:${job.contact_email}`, labelKey: 'contact_email' }
  }
  if (job.whatsapp_number) {
    const digits = job.whatsapp_number.replace(/\D/g, '')
    return {
      href: `https://wa.me/${digits}`,
      labelKey: 'contact_whatsapp',
      external: true,
    }
  }
  if (job.contact_phone) {
    return { href: `tel:${job.contact_phone}`, labelKey: 'contact_phone' }
  }
  return null
}

export default function JobMobileStickyBar({ job }: JobMobileStickyBarProps) {
  const t = useTranslations('jobs')

  if (isDeadlinePassed(job.deadline)) return null

  const action = getPrimaryApplyAction(job)
  if (!action) return null

  return (
    <div className="mobile-sticky-cta lg:hidden">
      <div className="container mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{job.company_name}</p>
          <p className="truncate text-xs text-muted-foreground">{t('how_to_apply')}</p>
        </div>
        <a
          href={action.href}
          onClick={() => {
            if (action.external) trackEvent('whatsapp_click', { location: 'job_sticky_bar', item_id: job.id })
          }}
          target={action.external ? '_blank' : undefined}
          rel={action.external ? 'noopener noreferrer' : undefined}
          className={cn(buttonVariants({ size: 'lg' }), 'shrink-0 whitespace-nowrap')}
        >
          {t(action.labelKey)}
        </a>
      </div>
    </div>
  )
}
