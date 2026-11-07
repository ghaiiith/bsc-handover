'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Briefcase, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Report BS-37: the abstract hero mock-up is replaced by three cards that each
 * link into a real section of the platform (Courses, Career, Services).
 *
 * Each card shows an image when one is available under /public/images/hero/*,
 * otherwise a branded gradient + icon so the section never renders broken art.
 */
interface HeroCard {
  key: 'courses' | 'career' | 'services'
  href: string
  icon: typeof BookOpen
  image?: string
  gradient: string
}

const CARDS: HeroCard[] = [
  {
    key: 'courses',
    href: '/courses',
    icon: BookOpen,
    gradient: 'from-brand-orange/25 via-brand-orange/10 to-transparent',
  },
  {
    key: 'career',
    href: '/jobs',
    icon: Briefcase,
    gradient: 'from-brand-teal/25 via-brand-teal/10 to-transparent',
  },
  {
    key: 'services',
    href: '/services',
    icon: Wrench,
    gradient: 'from-violet-500/25 via-violet-500/10 to-transparent',
  },
]

export default function HeroSectionCards({
  layout = 'row',
}: {
  /** 'stacked' fills a narrow column beside the banner. */
  layout?: 'row' | 'stacked'
}) {
  const t = useTranslations('landing.hero_cards')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <div
      className={cn(
        'grid w-full gap-4',
        layout === 'stacked' ? 'sm:grid-cols-3 lg:grid-cols-1 lg:content-between' : 'sm:grid-cols-3'
      )}
    >
      {CARDS.map((card, i) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
          >
            <Link
              href={`/${locale}${card.href}`}
              className={cn(
                'group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg',
                layout === 'stacked' && 'lg:h-full'
              )}
            >
              <div
                className={cn(
                  'relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br',
                  card.gradient
                )}
              >
                {card.image ? (
                  <Image src={card.image} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <Icon className="size-7 text-foreground/80" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-tight">{t(`${card.key}.title`)}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {t(`${card.key}.desc`)}
                </p>
              </div>

              <Arrow className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
