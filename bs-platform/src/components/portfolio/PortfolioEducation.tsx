'use client'

import { useTranslations } from 'next-intl'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/format-number'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { PortfolioStagger, PortfolioStaggerItem } from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { EducationItem } from '@/types/profile'

interface PortfolioEducationProps {
  locale: string
  education: EducationItem[]
}

export default function PortfolioEducation({ locale, education }: PortfolioEducationProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()
  const isAr = locale === 'ar'

  if (!education.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <PortfolioReveal>
        <PortfolioSectionHeader
          title={t('education_section')}
          subtitle={t('education_subtitle')}
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <PortfolioStagger className="grid gap-4 md:grid-cols-2">
        {education.map((item) => (
          <PortfolioStaggerItem key={item.id}>
            <div
              className={cn(
                'h-full rounded-2xl border p-5 transition-all duration-300',
                theme.cardBorder,
                theme.cardBg,
                theme.cardHover
              )}
            >
              <p className="font-bold text-white">{item.institution}</p>
              <p className="mt-1 text-slate-400">
                {item.degree} — {item.field}
              </p>
              <p className="num-en mt-2 text-sm text-slate-500">
                {formatCount(item.start_year)} —{' '}
                {item.is_current
                  ? isAr
                    ? 'حتى الآن'
                    : 'Present'
                  : item.end_year
                    ? formatCount(item.end_year)
                    : '—'}
                {item.gpa ? ` · GPA: ${item.gpa}` : ''}
              </p>
            </div>
          </PortfolioStaggerItem>
        ))}
      </PortfolioStagger>
    </section>
  )
}
