'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import PortfolioDotBackground from '@/components/portfolio/PortfolioDotBackground'
import { PortfolioThemeProvider } from '@/components/portfolio/PortfolioThemeProvider'
import { portfolioThemes, type PortfolioVariant } from '@/lib/portfolio/portfolio-theme'
import type { PortfolioStats } from '@/types/portfolio'

interface PortfolioShellProps {
  locale: string
  variant: PortfolioVariant
  stats: PortfolioStats
  children: React.ReactNode
}

export default function PortfolioShell({
  locale,
  variant,
  stats,
  children,
}: PortfolioShellProps) {
  const theme = portfolioThemes[variant]

  return (
    <PortfolioThemeProvider variant={variant} stats={stats}>
      <div className="relative min-h-screen text-slate-200">
        <PortfolioDotBackground variant={variant} />
        <motion.header
          className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0F1E]/70 backdrop-blur-xl"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link
              href={`/${locale}`}
              className="text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-80"
            >
              Edu<span style={{ color: theme.accent }}>Work</span>
            </Link>
            <span
              className="rounded-full border px-3 py-0.5 text-[10px] font-medium uppercase tracking-widest"
              style={{
                borderColor: `${theme.accent}40`,
                color: theme.accent,
                backgroundColor: theme.accentMuted,
              }}
            >
              Portfolio
            </span>
          </div>
        </motion.header>
        <main className="relative z-10">{children}</main>
      </div>
    </PortfolioThemeProvider>
  )
}
