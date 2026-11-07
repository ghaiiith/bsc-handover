import { getLocale, getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import AdminJobsFilters from '@/components/admin/AdminJobsFilters'
import AdminJobsTable from '@/components/admin/AdminJobsTable'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getAdminJobs,
  getAdminJobsStats,
  parseAdminJobsParams,
} from '@/lib/jobs/get-admin-jobs'
import { getPendingJobEdits } from '@/lib/jobs/admin-job-actions'
import PendingJobEditsPanel from '@/components/admin/PendingJobEditsPanel'

interface AdminJobsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminJobsPage({
  searchParams,
}: AdminJobsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('jobs')

  await requireAdminAccess(locale)

  const resolvedParams = await searchParams
  const filters = parseAdminJobsParams(resolvedParams)
  const [stats, jobs, pendingEdits] = await Promise.all([
    getAdminJobsStats(),
    getAdminJobs(filters),
    getPendingJobEdits(),
  ])

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">{t('admin_subtitle')}</p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/${locale}/admin/jobs/imported`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {t('review_imports')}
          </Link>
          <Link
            href={`/${locale}/admin/jobs/sources`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {t('job_sources')}
          </Link>
          <Link
            href={`/${locale}/admin/jobs/new`}
            className={cn(buttonVariants(), 'gap-2')}
          >
            <Plus className="h-4 w-4" />
            {t('create_job')}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('active_jobs_stat')}</p>
            <p className="text-2xl font-bold">{stats.activeJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('total_jobs_stat')}</p>
            <p className="text-2xl font-bold">{stats.totalJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('closed_jobs_stat')}</p>
            <p className="text-2xl font-bold">{stats.closedJobs}</p>
          </CardContent>
        </Card>
      </div>

      <PendingJobEditsPanel locale={locale} edits={pendingEdits as never} />

      <AdminJobsFilters
        key={filters.q ?? ''}
        locale={locale}
        status={filters.status ?? 'all'}
        q={filters.q}
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <AdminJobsTable locale={locale} jobs={jobs} />
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Jobs — Admin' }
