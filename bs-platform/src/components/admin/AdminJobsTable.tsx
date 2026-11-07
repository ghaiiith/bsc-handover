'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2, Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import { deleteJob, toggleJobStatus } from '@/lib/jobs/admin-job-actions'
import { formatDate } from '@/lib/utils'
import {
  getJobTypeLabel,
  isDeadlinePassed,
  jobTypeStyles,
} from '@/lib/jobs/job-utils'
import { cn } from '@/lib/utils'
import type { AdminJobRow } from '@/lib/jobs/get-admin-jobs'

interface AdminJobsTableProps {
  locale: string
  jobs: AdminJobRow[]
}

export default function AdminJobsTable({ locale, jobs }: AdminJobsTableProps) {
  const t = useTranslations('jobs')
  const tAdmin = useTranslations('admin')
  const tCandidates = useTranslations('candidates')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const isAr = locale === 'ar'

  const runAction = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      await action()
      router.refresh()
    })
  }

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        {t('no_jobs')}
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('title_col')}</TableHead>
            <TableHead>{t('company_col')}</TableHead>
            <TableHead>{t('filter_city')}</TableHead>
            <TableHead>{t('filter_type')}</TableHead>
            <TableHead>{t('deadline_col')}</TableHead>
            <TableHead>{t('status_col')}</TableHead>
            <TableHead>{tCandidates('candidates_col')}</TableHead>
            <TableHead className="text-end">{tAdmin('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const title = isAr ? job.title_ar : job.title
            const deadlinePassed = isDeadlinePassed(job.deadline)

            return (
              <TableRow key={job.id}>
                <TableCell className="font-medium max-w-[160px]">
                  <span className="line-clamp-2">{title}</span>
                </TableCell>
                <TableCell>{job.company_name}</TableCell>
                <TableCell>{job.city}</TableCell>
                <TableCell>
                  <Badge className={cn(jobTypeStyles[job.job_type])} variant="secondary">
                    {getJobTypeLabel(job.job_type, t)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'whitespace-nowrap',
                    deadlinePassed && 'text-destructive'
                  )}
                >
                  {job.deadline
                    ? formatDate(job.deadline, locale)
                    : '—'}
                </TableCell>
                <TableCell>
                  <JobStatusBadge status={job.status} />
                </TableCell>
                <TableCell>
                  <Link href={`/${locale}/admin/jobs/${job.id}/candidates`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-teal-600 border-teal-600/30 hover:bg-teal-600/10"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {tCandidates('find_button')}
                    </Button>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    <Link href={`/${locale}/admin/jobs/${job.id}/edit`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Pencil className="h-3.5 w-3.5" />
                        {tCommon('edit')}
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => toggleJobStatus(job.id, locale))
                      }
                    >
                      {job.status === 'active' ? t('close_job') : t('reopen_job')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => setDeleteId(job.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_job_title')}</DialogTitle>
            <DialogDescription>{t('delete_job_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteId) return
                runAction(async () => {
                  await deleteJob(deleteId, locale)
                  setDeleteId(null)
                })
              }}
            >
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
