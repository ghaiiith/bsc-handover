'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ExternalLink, FolderKanban, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { PortfolioStagger, PortfolioStaggerItem } from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { PortfolioProject } from '@/types/portfolio'

interface PortfolioProjectsProps {
  locale: string
  projects: PortfolioProject[]
}

export default function PortfolioProjects({ projects }: PortfolioProjectsProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (!projects.length) return null

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
          title={t('projects_section')}
          subtitle={t('projects_subtitle')}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <PortfolioStagger className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <PortfolioStaggerItem key={project.id}>
            <article
              className={cn(
                'group h-full rounded-2xl border p-6 transition-all duration-300',
                theme.cardBorder,
                theme.cardBg,
                theme.cardHover
              )}
            >
              <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-white">
                {project.name}
              </h3>
              <p
                className={cn(
                  'mb-4 text-sm leading-relaxed text-slate-400',
                  !expanded.has(project.id) && 'line-clamp-2'
                )}
              >
                {project.description}
              </p>
              {project.description.length > 100 && (
                <button
                  type="button"
                  onClick={() => toggle(project.id)}
                  className="mb-3 text-xs transition-opacity hover:opacity-80"
                  style={{ color: theme.accent }}
                >
                  {expanded.has(project.id) ? t('show_less') : t('show_more')}
                </button>
              )}
              {project.technologies.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {project.url && (
                  <Link
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
                    style={{ color: theme.accent }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('view_project')}
                  </Link>
                )}
                {project.github_url && (
                  <Link
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white"
                  >
                    <Link2 className="h-3 w-3" />
                    {t('source_code')}
                  </Link>
                )}
              </div>
            </article>
          </PortfolioStaggerItem>
        ))}
      </PortfolioStagger>
    </section>
  )
}
