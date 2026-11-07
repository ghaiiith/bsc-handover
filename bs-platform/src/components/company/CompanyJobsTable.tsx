'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2, Pencil, RefreshCw, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { getJobTypeLabel, jobTypeStyles } from '@/lib/jobs/job-utils'
import { renewCompanyJob } from '@/lib/jobs/company-job-actions'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

interface CompanyJobsTableProps {
  locale: string
  jobs: Job[]
}

function RenewJobButton({ jobId, locale }: { jobId: string; locale: string }) {
  const t = useTranslations('jobs')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onRenew = () => {
    startTransition(async () => {
      const res = await renewCompanyJob(jobId, locale)
      if (res.error) {
        toast.error(t('renew_failed'))
      } else {
        toast.success(t('renew_success'))
        router.refresh()
      }
    })
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onRenew} disabled={isPending}>
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin me-1" />
      ) : (
        <RefreshCw className="size-3.5 me-1" />
      )}
      {t('renew_job')}
    </Button>
  )
}

export default function CompanyJobsTable({ locale, jobs }: CompanyJobsTableProps) {
  const t = useTranslations('jobs')
  const tAdmin = useTranslations('admin')
  const isAr = locale === 'ar'

  if (jobs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">{t('no_jobs')}</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('title_col')}</TableHead>
          <TableHead>{t('company_col')}</TableHead>
          <TableHead>{t('filter_city')}</TableHead>
          <TableHead>{t('filter_type')}</TableHead>
          <TableHead>{t('deadline_col')}</TableHead>
          <TableHead>{t('status_col')}</TableHead>
          <TableHead className="text-end">{tAdmin('actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const title = isAr ? job.title_ar : job.title
          const typeLabel = getJobTypeLabel(job.job_type, t)
          const typeStyle = jobTypeStyles[job.job_type]

          return (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{title}</TableCell>
              <TableCell>{job.company_name}</TableCell>
              <TableCell>{job.city}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    typeStyle
                  )}
                >
                  {typeLabel}
                </span>
              </TableCell>
              <TableCell>
                {job.deadline ? formatDate(job.deadline, locale) : '—'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  <JobStatusBadge status={job.status} />
                  {job.pending_review_status === 'pending' && (
                    <Badge variant="secondary">{t('changes_pending')}</Badge>
                  )}
                  {job.pending_review_status === 'rejected' && (
                    <Badge variant="destructive" title={job.pending_rejection_reason ?? undefined}>
                      {t('changes_rejected')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-end">
                <div className="inline-flex items-center gap-1">
                  <Link
                    href={`/${locale}/dashboard/company-jobs/${job.id}/applicants`}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    <Users className="size-3.5" />
                    {t('applicants')}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/company-jobs/${job.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    <Pencil className="size-3.5" />
                    {t('edit_job')}
                  </Link>
                  {job.status === 'expired' && (
                    <RenewJobButton jobId={job.id} locale={locale} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
