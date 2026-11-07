'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react'
import { IRAQI_CITIES, IRAQI_CITIES_EN } from '@/lib/constants'
import { formatCount } from '@/lib/format-number'
import type { CommunityCategoryStat } from '@/types/community'
import { cn } from '@/lib/utils'

interface CommunityFiltersProps {
  categoryStats: CommunityCategoryStat[]
  total: number
  current: {
    category?: string
    city?: string
    available?: boolean
    q?: string
    sort?: string
    page?: number
  }
}

export default function CommunityFilters({
  categoryStats,
  total,
  current,
}: CommunityFiltersProps) {
  const t = useTranslations('community')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [textQ, setTextQ] = useState(current.q ?? '')

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setFiltersOpen(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === 'all') params.delete(key)
        else params.set(key, value)
      }
      if (!patch.page) params.delete('page')
      startTransition(() => {
        router.replace(`/${locale}/community?${params.toString()}`, { scroll: false })
      })
    },
    [locale, router, searchParams]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((current.q ?? '') !== textQ) {
        updateParams({ q: textQ || undefined, page: undefined })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [textQ, current.q, updateParams])

  const activeCategory = current.category ?? 'all'
  const hasActiveFilters =
    activeCategory !== 'all' ||
    Boolean(current.city) ||
    Boolean(current.available) ||
    Boolean(current.q) ||
    (current.sort && current.sort !== 'newest')

  return (
    <div className="sticky top-16 z-30 border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto max-w-6xl px-4 py-4 md:py-5">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 scrollbar-none snap-x snap-mandatory">
          <button
            type="button"
            onClick={() => updateParams({ category: undefined, page: undefined })}
            className={cn(
              'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-all',
              activeCategory === 'all'
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border/80 bg-card/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {t('filter_all')}
          </button>
          {categoryStats.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => updateParams({ category: cat.value, page: undefined })}
              className={cn(
                'shrink-0 snap-start whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
                activeCategory === cat.value
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/80 bg-card/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {cat.emoji} {locale === 'ar' ? cat.label : cat.labelEn}{' '}
              <span className="tabular-nums opacity-90">{formatCount(cat.count)}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mb-3 flex w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2.5 text-sm text-muted-foreground md:hidden"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <SlidersHorizontal className="size-4 text-primary" />
            {t('filters_label')}
            {hasActiveFilters && (
              <span className="size-2 rounded-full bg-primary" aria-hidden />
            )}
          </span>
          {filtersOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        <div className={cn('space-y-3', !filtersOpen && 'hidden md:block')}>
          <div className="hidden items-center justify-between md:flex">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="size-4 text-primary" />
              {t('filters_label')}
            </div>
            <p className={cn('text-sm text-muted-foreground', pending && 'opacity-60')}>
              {t('showing_count', { count: formatCount(total) })}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/60 bg-card/50 p-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={textQ}
                onChange={(e) => setTextQ(e.target.value)}
                placeholder={t('text_search_placeholder')}
                className="h-10 w-full rounded-xl border border-input bg-background ps-9 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            <select
              value={current.city ?? 'all'}
              onChange={(e) => updateParams({ city: e.target.value, page: undefined })}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="all">{t('filter_city_all')}</option>
              {IRAQI_CITIES_EN.map((cityEn, i) => (
                <option key={cityEn} value={cityEn}>
                  {locale === 'ar' ? IRAQI_CITIES[i] : cityEn}
                </option>
              ))}
            </select>

            <select
              value={current.sort ?? 'newest'}
              onChange={(e) => updateParams({ sort: e.target.value, page: undefined })}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="newest">{t('sort_newest')}</option>
              <option value="most_skills">{t('sort_most_skills')}</option>
              <option value="highest_completion">{t('sort_highest_completion')}</option>
              <option value="most_courses">{t('sort_most_courses')}</option>
            </select>

            <label className="inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground transition-colors has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5">
              <input
                type="checkbox"
                checked={Boolean(current.available)}
                onChange={(e) =>
                  updateParams({
                    available: e.target.checked ? 'true' : undefined,
                    page: undefined,
                  })
                }
                className="rounded border-input text-primary focus:ring-primary/20"
              />
              {t('filter_available')}
            </label>
          </div>
        </div>

        <p className={cn('mt-3 text-sm text-muted-foreground md:hidden', pending && 'opacity-60')}>
          {t('showing_count', { count: formatCount(total) })}
        </p>
      </div>
    </div>
  )
}
