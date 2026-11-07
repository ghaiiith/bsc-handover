import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import CompanyJobsTable from '@/components/company/CompanyJobsTable'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireCompanyRep } from '@/lib/company/require-company'
import type { Job } from '@/types'
import { getCompanyJobs } from '@/lib/jobs/company-job-actions'

export default async function CompanyJobsPage() {
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const userId = await requireCompanyRep(locale)
  const jobs = await getCompanyJobs(userId)

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('company_jobs_title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('company_jobs_subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/dashboard/company-jobs/new`}
          className={cn(buttonVariants(), 'gap-2 shrink-0')}
        >
          <Plus className="size-4" />
          {t('create_job')}
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <CompanyJobsTable locale={locale} jobs={jobs as Job[]} />
        </CardContent>
      </Card>
    </div>
  )
}
