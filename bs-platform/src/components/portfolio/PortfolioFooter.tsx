'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { portfolioThemes, type PortfolioVariant } from '@/lib/portfolio/portfolio-theme'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

interface PortfolioFooterProps {
  locale: string
  ownerName: string
  variant: PortfolioVariant
  ctaHref: string
}

export default function PortfolioFooter({
  locale,
  ownerName,
  variant,
  ctaHref,
}: PortfolioFooterProps) {
  const t = useTranslations('portfolio')
  const theme = portfolioThemes[variant]
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-8 border-t border-white/5 px-4 py-14 text-center">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-md"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.accent}80, transparent)`,
        }}
        aria-hidden
      />
      <p className="mb-2 text-sm text-slate-500">
        {t('created_on')}{' '}
        <Link
          href={`/${locale}`}
          className="font-semibold transition-opacity hover:opacity-80"
          style={{ color: theme.accent }}
        >
          {BRAND_FULL_NAME}
        </Link>
      </p>
      <Link
        href={ctaHref}
        className="mb-6 inline-block text-sm text-white transition-colors hover:opacity-80"
      >
        {t('create_yours')} →
      </Link>
      <p className="num-en text-xs text-slate-600">
        © {year} {ownerName}
      </p>
    </footer>
  )
}
