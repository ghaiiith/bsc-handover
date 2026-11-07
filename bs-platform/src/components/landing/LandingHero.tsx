'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { JourneyStageId } from '@/components/home/journey-timeline/journey-stages'
import HomepageBanner from '@/components/landing/HomepageBanner'
import type { HomepageBanner as BannerSlide } from '@/lib/admin/platform-settings'

const HeroSectionCards = dynamic(() => import('@/components/landing/HeroSectionCards'), {
  loading: () => (
    <div className="grid w-full gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-border/40 bg-muted/20" />
      ))}
    </div>
  ),
})

export default function LandingHero({ banners }: { banners: BannerSlide[] }) {
  const t = useTranslations('landing.hero')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <section className="relative overflow-hidden pt-28 pb-12 md:pt-32 md:pb-16">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Report BS-72: headline on top, then Courses/Career/Services as three
            equal cards in a single row (the full-width banner renders beneath the
            hero, from the homepage). */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border border-primary/20 bg-primary/5 px-3 py-1 text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('badge')}
          </Badge>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            <span className="block">{t('line1')}</span>
            <span className="text-brand-orange">{t('line2')} </span>
            <span className="text-brand-teal">{t('line3')}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/courses`}
              className={cn(buttonVariants({ size: 'lg' }), 'gap-2 shadow-md')}
            >
              {t('cta_primary')}
              <Arrow className="h-4 w-4" />
            </Link>
            <Link
              href={`/${locale}/jobs`}
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'border-brand-teal/30 text-brand-teal hover:bg-brand-teal-soft hover:text-brand-teal'
              )}
            >
              {t('cta_secondary')}
            </Link>
          </div>
        </motion.div>

        {/* The banner the admin fills with rotating images, with the three
            service cards down its LEFT side (RTL: banner right, cards left;
            mirrored in English). Everything stacks on mobile. */}
        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-[2fr_1fr]">
          <HomepageBanner banners={banners} />
          <HeroSectionCards layout="stacked" />
        </div>
      </div>
    </section>
  )
}
