'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Award, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { PortfolioStagger, PortfolioStaggerItem } from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { Certificate } from '@/types/certificate'

interface PortfolioCertificatesProps {
  locale: string
  certificates: Certificate[]
}

export default function PortfolioCertificates({
  locale,
  certificates,
}: PortfolioCertificatesProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()
  const isAr = locale === 'ar'

  if (!certificates.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <PortfolioReveal>
        <PortfolioSectionHeader
          title={t('certificates_section')}
          subtitle={t('verified_certificates')}
          icon={<Award className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <PortfolioStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {certificates.map((cert) => {
          const title = isAr ? cert.course_title_ar : cert.course_title
          return (
            <PortfolioStaggerItem key={cert.id}>
              <Link
                href={`/${locale}/certificate/${cert.verification_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group block rounded-2xl border p-4 transition-all duration-300',
                  theme.cardBorder,
                  theme.cardBg,
                  theme.cardHover
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-xl border p-2.5"
                    style={{
                      backgroundColor: theme.accentMuted,
                      borderColor: `${theme.accent}40`,
                    }}
                  >
                    <Award className="h-5 w-5" style={{ color: theme.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold text-white transition-colors group-hover:text-white">
                      {title}
                    </p>
                    <p className="num-en mt-1 text-xs text-slate-500">
                      {formatDate(cert.issued_at, locale)}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-slate-400" />
                </div>
              </Link>
            </PortfolioStaggerItem>
          )
        })}
      </PortfolioStagger>
    </section>
  )
}
