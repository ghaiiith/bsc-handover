import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Building2, Briefcase } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { formatCount } from '@/lib/format-number'
import type { LandingCompany } from '@/lib/landing/get-landing-data'

interface CompaniesSectionProps {
  companies: LandingCompany[]
}

export default async function CompaniesSection({ companies }: CompaniesSectionProps) {
  const t = await getTranslations('landing.companies')
  const locale = await getLocale()

  return (
    <section id="companies" className="bg-muted/20 py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {companies.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map((company) => (
              <Link
                key={company.name}
                href={`/${locale}/jobs`}
                className="edu-card flex flex-col gap-4 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{company.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span className="num-en">
                      {formatCount(company.openPositions)} {t('open_positions')}
                    </span>
                  </p>
                </div>
                {company.hiring && (
                  <Badge className="w-fit bg-brand-green/10 text-brand-green hover:bg-brand-green/15">
                    {t('hiring')}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        )}
      </div>
    </section>
  )
}
