'use client'

import { useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import FeaturedTalentCard from '@/components/community/FeaturedTalentCard'
import type { CommunityMember } from '@/types/community'
import { cn } from '@/lib/utils'

interface CommunityFeaturedRowProps {
  members: CommunityMember[]
  canViewPortfolios?: boolean
  viewerUserId?: string | null
}

export default function CommunityFeaturedRow({
  members,
  canViewPortfolios = false,
  viewerUserId = null,
}: CommunityFeaturedRowProps) {
  const t = useTranslations('community')
  const locale = useLocale()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isRTL = locale === 'ar'

  if (members.length === 0) return null

  const scroll = (direction: 'prev' | 'next') => {
    const el = scrollRef.current
    if (!el) return
    const amount = 296
    const delta = direction === 'next' ? amount : -amount
    el.scrollBy({ left: isRTL ? -delta : delta, behavior: 'smooth' })
  }

  return (
    <section className="relative border-b bg-gradient-to-b from-primary/[0.03] via-muted/10 to-transparent py-10 md:py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              {t('featured_eyebrow')}
            </p>
            <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Star className="size-4 fill-primary text-primary" />
              </span>
              {t('featured_section')}
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll('prev')}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-primary/35 hover:bg-card hover:text-foreground hover:shadow'
              )}
              aria-label={t('carousel_prev')}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('next')}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-primary/35 hover:bg-card hover:text-foreground hover:shadow'
              )}
              aria-label={t('carousel_next')}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {members.map((member) => (
            <div
              key={member.id}
              className="w-[min(82vw,280px)] shrink-0 snap-start sm:w-[280px]"
            >
              <FeaturedTalentCard
                member={member}
                className="min-h-[22rem]"
                canViewPortfolios={canViewPortfolios}
                viewerUserId={viewerUserId}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
