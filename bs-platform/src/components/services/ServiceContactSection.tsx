'use client'

import { trackEvent } from '@/lib/tracking/track-event'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, Phone, ExternalLink, MessageCircle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceContactSectionProps {
  service: Pick<
    Service,
    'contact_email' | 'contact_phone' | 'contact_link' | 'whatsapp_number'
  >
}

export default function ServiceContactSection({ service }: ServiceContactSectionProps) {
  const t = useTranslations('services')
  const tJobs = useTranslations('jobs')
  const [copiedPhone, setCopiedPhone] = useState(false)

  const hasContact =
    service.contact_email ||
    service.contact_phone ||
    service.contact_link ||
    service.whatsapp_number

  if (!hasContact) return null

  const copyPhone = async () => {
    if (!service.contact_phone) return
    try {
      await navigator.clipboard.writeText(service.contact_phone)
      setCopiedPhone(true)
      toast.success(tJobs('phone_copied'))
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch {
      toast.error(t('load_error'))
    }
  }

  const whatsappHref = service.whatsapp_number
    ? `https://wa.me/${service.whatsapp_number.replace(/\D/g, '')}`
    : null

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t('contact_section')}</h2>
      <p className="text-sm text-muted-foreground">{t('contact_section_hint')}</p>

      <div className="flex flex-col gap-2 max-w-md">
        {service.contact_email && (
          <a
            href={`mailto:${service.contact_email}`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start gap-2'
            )}
          >
            <Mail className="h-4 w-4 shrink-0" />
            {tJobs('contact_email')}
          </a>
        )}

        {service.contact_phone && (
          <div className="flex gap-2">
            <div
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'flex-1 justify-start gap-2 pointer-events-none'
              )}
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span dir="ltr">{service.contact_phone}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyPhone}
              aria-label={tJobs('contact_phone')}
            >
              {copiedPhone ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {service.contact_link && (
          <a
            href={service.contact_link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start gap-2'
            )}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {t('contact_external_link')}
          </a>
        )}

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('whatsapp_click', { location: 'service_page' })}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start gap-2'
            )}
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            {tJobs('contact_whatsapp')}
          </a>
        )}
      </div>
    </section>
  )
}
