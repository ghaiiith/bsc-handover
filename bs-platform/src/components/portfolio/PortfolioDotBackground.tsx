'use client'

import { motion } from 'framer-motion'
import { portfolioThemes, type PortfolioVariant } from '@/lib/portfolio/portfolio-theme'

interface PortfolioDotBackgroundProps {
  variant: PortfolioVariant
}

export default function PortfolioDotBackground({ variant }: PortfolioDotBackgroundProps) {
  const theme = portfolioThemes[variant]

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0A0F1E]"
      aria-hidden
      style={{ backgroundImage: theme.meshGradient }}
    >
      <motion.div
        className={`absolute -top-32 start-1/4 h-96 w-96 rounded-full blur-3xl ${theme.orbPrimary}`}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`absolute top-1/3 end-0 h-80 w-80 rounded-full blur-3xl ${theme.orbSecondary}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className={`absolute bottom-0 start-1/3 h-72 w-72 rounded-full blur-3xl ${theme.orbPrimary}`}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.22]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="portfolio-dots" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#475569" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#portfolio-dots)" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0F1E]/40 to-[#0A0F1E]" />
    </div>
  )
}
