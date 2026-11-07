import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import JobCard from '@/components/jobs/JobCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

interface FeaturedJobsSectionProps {
  jobs: Job[]
}

export default async function FeaturedJobsSection({ jobs }: FeaturedJobsSectionProps) {
  const t = await getTranslations('landing.jobs')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <section id="jobs" className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <div key={job.id} className="edu-card overflow-hidden p-1">
                <JobCard job={job} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        )}

        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/jobs`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
          >
            {t('view_all')}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
