'use client'

import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { PortfolioStagger, PortfolioStaggerItem } from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'

interface PortfolioSkillsProps {
  skills: string[]
}

export default function PortfolioSkills({ skills }: PortfolioSkillsProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()

  if (!skills.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <PortfolioReveal>
        <PortfolioSectionHeader
          title={t('skills_section')}
          subtitle={t('skills_subtitle')}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <PortfolioStagger className="flex flex-wrap gap-2.5">
        {skills.map((skill) => (
          <PortfolioStaggerItem key={skill}>
            <span
              className={cn(
                'inline-block rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 backdrop-blur-sm transition-all duration-300',
                theme.pillHover
              )}
            >
              {skill}
            </span>
          </PortfolioStaggerItem>
        ))}
      </PortfolioStagger>
    </section>
  )
}
