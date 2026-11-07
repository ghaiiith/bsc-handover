'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Sparkles, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AnimatedCounter from '@/components/landing/AnimatedCounter'
import { Badge } from '@/components/ui/badge'
import type { CommunityPlatformStats } from '@/types/community'

interface CommunityHeroProps {
  stats: CommunityPlatformStats
  children?: ReactNode
}

function StatCard({ value, label, delay }: { value: number; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="edu-glass min-w-[100px] flex-1 rounded-2xl border px-4 py-4 text-center sm:min-w-[120px]"
    >
      <div className="text-2xl font-bold text-foreground md:text-3xl">
        <AnimatedCounter value={value} />
      </div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </motion.div>
  )
}

export default function CommunityHero({ stats, children }: CommunityHeroProps) {
  const t = useTranslations('community')

  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 end-0 size-[420px] rounded-full bg-brand-green/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 start-0 size-[360px] rounded-full bg-primary/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="container relative mx-auto max-w-6xl px-4 pb-10 pt-10 md:pb-14 md:pt-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-5"
          >
            <Badge
              variant="secondary"
              className="gap-1.5 border border-primary/20 bg-primary/5 px-3 py-1 text-primary"
            >
              <Sparkles className="size-3.5" />
              <span>🇮🇶 {t('badge')}</span>
            </Badge>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                {t('title_prefix')}{' '}
                <span className="edu-gradient-text">{t('title_highlight')}</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {t('subtitle')}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
              <MapPin className="size-3.5 text-primary" />
              <Users className="size-3.5 text-primary" />
              <span>{t('hero_trust_line')}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex w-full gap-3 sm:gap-4 lg:max-w-md lg:pt-2"
          >
            <StatCard value={stats.totalMembers} label={t('members_count')} delay={0.15} />
            <StatCard value={stats.fieldsCount} label={t('fields_count')} delay={0.22} />
            <StatCard value={stats.citiesCount} label={t('cities_count')} delay={0.29} />
          </motion.div>
        </div>

        {children ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-10 md:mt-12"
          >
            {children}
          </motion.div>
        ) : null}
      </div>
    </section>
  )
}
