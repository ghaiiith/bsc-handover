'use client'

import { useTranslations } from 'next-intl'
import AnimatedCounter from '@/components/landing/AnimatedCounter'
import type { LandingStats } from '@/lib/landing/get-landing-data'

interface TrustSectionProps {
  stats: LandingStats
}

const STAT_KEYS = [
  { key: 'students' as const, stat: 'students' as const, suffix: '+' },
  { key: 'courses' as const, stat: 'courses' as const, suffix: '+' },
  { key: 'jobs' as const, stat: 'jobs' as const, suffix: '+' },
  { key: 'instructors' as const, stat: 'instructors' as const, suffix: '+' },
  { key: 'companies' as const, stat: 'companies' as const, suffix: '+' },
]

export default function TrustSection({ stats }: TrustSectionProps) {
  const t = useTranslations('landing.trust')

  return (
    <section className="border-y border-border/60 bg-muted/30 py-14 md:py-16">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5 md:gap-6">
          {STAT_KEYS.map((item) => (
            <div key={item.key} className="text-center">
              <div className="text-3xl font-bold text-primary md:text-4xl">
                <AnimatedCounter
                  value={Math.max(stats[item.stat], item.stat === 'students' ? 500 : 10)}
                  suffix={item.suffix}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t(item.key)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
