'use client'

import { trackEvent } from '@/lib/tracking/track-event'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, Phone, ExternalLink, MessageCircle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

interface JobContactSectionProps {
  job: Job
  locale: string
  variant?: 'inline' | 'sidebar'
}

export default function JobContactSection({
  job,
  variant = 'inline',
}: JobContactSectionProps) {
  const t = useTranslations('jobs')
  const [copiedPhone, setCopiedPhone] = useState(false)

  const copyPhone = async () => {
    if (!job.contact_phone) return
    try {
      await navigator.clipboard.writeText(job.contact_phone)
      setCopiedPhone(true)
      toast.success(t('phone_copied'))
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch {
      toast.error(t('load_error'))
    }
  }

  const whatsappHref = job.whatsapp_number
    ? `https://wa.me/${job.whatsapp_number.replace(/\D/g, '')}`
    : null

  const isSidebar = variant === 'sidebar'

  return (
    <div className={cn('space-y-4', isSidebar && 'space-y-3')}>
      {!isSidebar && (
        <h2 className="text-lg font-semibold">{t('how_to_apply')}</h2>
      )}

      <p className="text-sm text-muted-foreground">{t('contact_employer')}</p>

      <div className={cn('flex flex-col gap-2', isSidebar && 'gap-2')}>
        {job.contact_email && (
          <a
            href={`mailto:${job.contact_email}`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start gap-2'
            )}
          >
            <Mail className="h-4 w-4 shrink-0" />
            {t('contact_email')}
          </a>
        )}

        {job.contact_phone && (
          <div className="flex gap-2">
            <div
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'flex-1 justify-start gap-2 pointer-events-none'
              )}
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span dir="ltr">{job.contact_phone}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyPhone}
              aria-label={t('contact_phone')}
            >
              {copiedPhone ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {job.contact_link && (
          <a
            href={job.contact_link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start gap-2'
            )}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {t('apply_via_link')}
          </a>
        )}

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            // Marketing item 4: a WhatsApp click is a Lead conversion.
            onClick={() => trackEvent('whatsapp_click', { location: 'job_page', item_id: job.id })}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start gap-2'
            )}
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            {t('contact_whatsapp')}
          </a>
        )}
      </div>
    </div>
  )
}
