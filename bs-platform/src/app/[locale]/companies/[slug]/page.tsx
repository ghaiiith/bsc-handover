import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Globe,
  MapPin,
  Star,
  Users,
} from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getPublicCompany } from '@/lib/companies/get-public-company'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getJobTypeLabel } from '@/lib/jobs/job-utils'

/**
 * Round 9 (BS-102): a stable public page per company —
 * /[locale]/companies/[slug]. Reads only what get-public-company allows out.
 */

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const company = await getPublicCompany(slug)
  if (!company) return {}
  const isAr = locale === 'ar'
  const name = (isAr ? company.nameAr : company.name) || company.name
  return buildPageMetadata({
    locale,
    path: `/companies/${slug}`,
    title: name,
    description:
      company.tagline ??
      (isAr ? company.description : company.descriptionEn ?? company.description)?.slice(0, 160) ??
      name,
  })
}

export default async function CompanyPublicPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const company = await getPublicCompany(slug)
  if (!company) notFound()

  const t = await getTranslations('company_public')
  const tj = await getTranslations('jobs')
  const isAr = locale === 'ar'
  const name = (isAr ? company.nameAr : company.name) || company.name
  const description = (isAr ? company.description : company.descriptionEn) || company.description

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
              {company.logoUrl ? (
                <Image src={company.logoUrl} alt={name} width={96} height={96} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{name}</h1>
                {company.verified && (
                  <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t('verified')}
                  </Badge>
                )}
              </div>
              {company.tagline && <p className="text-muted-foreground">{company.tagline}</p>}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {company.industry && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {company.industry}
                  </span>
                )}
                {(company.city || company.governorate) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {company.city ?? company.governorate}
                  </span>
                )}
                {company.size && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" /> {company.size}
                  </span>
                )}
                {company.yearFounded && (
                  <span className="inline-flex items-center gap-1 num-en">
                    <Calendar className="h-4 w-4" /> {t('founded', { year: company.yearFounded })}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" /> {t('website')}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {description && (
              <section>
                <h2 className="mb-3 text-lg font-bold">{t('about')}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{description}</p>
              </section>
            )}

            {company.cultureBlurb && (
              <section>
                <h2 className="mb-3 text-lg font-bold">{t('culture')}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{company.cultureBlurb}</p>
              </section>
            )}

            {company.benefits.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">{t('benefits')}</h2>
                <div className="flex flex-wrap gap-2">
                  {company.benefits.map((b) => (
                    <Badge key={b} variant="secondary">{b}</Badge>
                  ))}
                </div>
              </section>
            )}

            {company.workplacePhotos.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">{t('workplace')}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {company.workplacePhotos.slice(0, 6).map((src) => (
                    <div key={src} className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                      <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <h2 className="text-lg font-bold">{t('open_jobs', { count: company.jobs.length })}</h2>
            {company.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('no_jobs')}</p>
            ) : (
              company.jobs.map((job) => (
                <Link key={job.id} href={`/${locale}/jobs/${job.id}`} className="block">
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="space-y-2 p-4">
                      {job.isFeatured && (
                        <Badge className="gap-1 bg-amber-500 text-[11px] text-white hover:bg-amber-500">
                          <Star className="h-3 w-3 fill-current" /> {tj('featured_job')}
                        </Badge>
                      )}
                      <p className="font-semibold leading-snug">{(isAr ? job.titleAr : job.title) || job.title}</p>
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {job.city && <span>{job.city}</span>}
                        {job.jobType && <span>· {getJobTypeLabel(job.jobType as never, tj)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
            {company.hiresGrads && (
              <p className="text-xs text-muted-foreground">{t('hires_grads')}</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
