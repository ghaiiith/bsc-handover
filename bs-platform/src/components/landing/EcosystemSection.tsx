import { getTranslations } from 'next-intl/server'
import { ArrowDown } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import { cn } from '@/lib/utils'

const STEPS = [
  'learn',
  'practice',
  'portfolio',
  'certified',
  'apply',
  'hired',
] as const

export default async function EcosystemSection() {
  const t = await getTranslations('landing.ecosystem')

  return (
    <section id="ecosystem" className="py-20 md:py-28">
      <div className="container mx-auto max-w-4xl px-4">
        <SectionHeader
          eyebrow={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="relative mx-auto max-w-md">
          {STEPS.map((step, index) => (
            <div key={step} className="flex flex-col items-center">
              <div
                className={cn(
                  'edu-card w-full px-6 py-4 text-center transition-colors',
                  index === STEPS.length - 1 && 'border-brand-green/40 bg-brand-green/5'
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground num-en">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <p className="mt-1 text-lg font-semibold">{t(`steps.${step}`)}</p>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex flex-col items-center py-2 text-muted-foreground/50">
                  <ArrowDown className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
