'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'

interface PortfolioSectionHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  className?: string
}

export default function PortfolioSectionHeader({
  title,
  subtitle,
  icon,
  className,
}: PortfolioSectionHeaderProps) {
  const { theme } = usePortfolioTheme()

  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              theme.cardBorder,
              theme.cardBg
            )}
            style={{ color: theme.accent }}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div
        className={cn('mt-4 h-1 w-20 rounded-full bg-gradient-to-r', theme.ringGradient)}
        aria-hidden
      />
    </div>
  )
}
