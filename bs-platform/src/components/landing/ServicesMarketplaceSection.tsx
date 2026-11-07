import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import ServiceCard from '@/components/services/ServiceCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ServiceListItem } from '@/lib/services/list-services'

interface ServicesMarketplaceSectionProps {
  services: ServiceListItem[]
}

export default async function ServicesMarketplaceSection({
  services,
}: ServicesMarketplaceSectionProps) {
  const t = await getTranslations('landing.services')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <section id="services" className="bg-muted/20 py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {services.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service.id} className="edu-card overflow-hidden [&_.group]:hover:shadow-none">
                <ServiceCard service={service} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        )}

        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/services`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
          >
            {t('view_all')}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
