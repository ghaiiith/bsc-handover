'use client'

import { createContext, useContext, useMemo } from 'react'
import {
  portfolioThemes,
  type PortfolioTheme,
  type PortfolioVariant,
} from '@/lib/portfolio/portfolio-theme'
import type { PortfolioStats } from '@/types/portfolio'

interface PortfolioThemeContextValue {
  variant: PortfolioVariant
  theme: PortfolioTheme
  isInstructor: boolean
  stats: PortfolioStats
}

const PortfolioThemeContext = createContext<PortfolioThemeContextValue | null>(null)

export function PortfolioThemeProvider({
  variant,
  stats,
  children,
}: {
  variant: PortfolioVariant
  stats: PortfolioStats
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({
      variant,
      theme: portfolioThemes[variant],
      isInstructor: variant === 'instructor',
      stats,
    }),
    [variant, stats]
  )

  return (
    <PortfolioThemeContext.Provider value={value}>{children}</PortfolioThemeContext.Provider>
  )
}

export function usePortfolioTheme() {
  const ctx = useContext(PortfolioThemeContext)
  if (!ctx) {
    throw new Error('usePortfolioTheme must be used within PortfolioThemeProvider')
  }
  return ctx
}
