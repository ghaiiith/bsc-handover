'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatExperienceDateRange } from '@/lib/profile/format-profile-dates'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { ExperienceItem } from '@/types/profile'

interface PortfolioExperienceProps {
  locale: string
  experience: ExperienceItem[]
}

export default function PortfolioExperience({ locale, experience }: PortfolioExperienceProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (!experience.length) return null

  const sorted = [...experience].sort((a, b) => b.start_date.localeCompare(a.start_date))

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <PortfolioReveal>
        <PortfolioSectionHeader
          title={t('experience_section')}
          subtitle={t('experience_subtitle')}
          icon={<Briefcase className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <div className="relative ms-4 space-y-6 border-s border-white/10">
        {sorted.map((item, index) => (
          <PortfolioReveal key={item.id} delay={index * 0.06}>
            <div className="relative ps-8">
              <div
                className={cn(
                  'absolute -start-[5px] top-2 h-2.5 w-2.5 rounded-full',
                  theme.timelineDot
                )}
              />
              <div
                className={cn(
                  'rounded-2xl border p-5 transition-all duration-300',
                  theme.cardBorder,
                  theme.cardBg,
                  theme.cardHover
                )}
              >
                <h3 className="font-bold text-white">
                  {item.title}
                  <span className="font-normal text-slate-400"> — {item.company}</span>
                </h3>
                <p className="num-en mt-1 text-sm text-slate-400">
                  {formatExperienceDateRange(
                    item.start_date,
                    item.end_date,
                    item.is_current,
                    locale === 'ar' ? 'حتى الآن' : 'Present'
                  )}
                  {item.location ? ` · ${item.location}` : ''}
                </p>
                {item.description && (
                  <>
                    <p
                      className={cn(
                        'mt-3 text-sm leading-relaxed text-slate-300',
                        !expanded.has(item.id) && 'line-clamp-3'
                      )}
                    >
                      {item.description}
                    </p>
                    {item.description.length > 120 && (
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        className="mt-2 text-xs transition-opacity hover:opacity-80"
                        style={{ color: theme.accent }}
                      >
                        {expanded.has(item.id) ? t('show_less') : t('show_more')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </PortfolioReveal>
        ))}
      </div>
    </section>
  )
}
