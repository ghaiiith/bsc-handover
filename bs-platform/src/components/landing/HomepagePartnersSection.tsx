import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { GraduationCap } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import CompaniesSlider from '@/components/landing/CompaniesSlider'
import type { CuratedCompany, LandingCompany, LandingInstructor } from '@/lib/landing/get-landing-data'

/**
 * Report BS-74: replaces the "Platform Features" section — an admin-picked
 * companies slider with a trainers row beneath it (trainers = role=instructor,
 * shown automatically). Falls back to auto-aggregated companies when the admin
 * has not picked any.
 */
export default async function HomepagePartnersSection({
  curatedCompanies,
  companies,
  instructors,
}: {
  curatedCompanies: CuratedCompany[]
  companies: LandingCompany[]
  instructors: LandingInstructor[]
}) {
  const locale = await getLocale()
  const t = await getTranslations('landing.partners')
  const isAr = locale === 'ar'

  const companyItems =
    curatedCompanies.length > 0
      ? curatedCompanies.map((c) => ({
          name: isAr ? c.name_ar || c.name : c.name,
          logo: c.logo_url || '',
          link: c.link || '',
        }))
      : companies.map((c) => ({ name: c.name, logo: '', link: '' }))

  if (companyItems.length === 0 && instructors.length === 0) return null

  return (
    <section className="py-16">
      <div className="container mx-auto max-w-6xl px-4">
        {companyItems.length > 0 && (
          <>
            <SectionHeader eyebrow={t('companies_eyebrow')} title={t('companies_title')} />
            <div className="mt-8">
              <CompaniesSlider companies={companyItems} />
            </div>
          </>
        )}

        {instructors.length > 0 && (
          <div className="mt-14">
            <SectionHeader eyebrow={t('trainers_eyebrow')} title={t('trainers_title')} />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {instructors.map((ins) => (
                <div
                  key={ins.id}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card/70 p-5 text-center backdrop-blur"
                >
                  <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {ins.avatar_url ? (
                      <Image src={ins.avatar_url} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      <GraduationCap className="size-7 text-muted-foreground" />
                    )}
                  </div>
                  <p className="line-clamp-1 text-sm font-semibold">
                    {(isAr ? ins.full_name_ar : ins.full_name) || ins.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('course_count', { count: ins.courseCount })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
