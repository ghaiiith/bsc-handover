'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import {
  adminDeleteApplication,
  type AdminApplicationRow,
} from '@/lib/admin/admin-application-actions'

/** Report BS-66: the ONLY place an application can be removed — and it is logged. */
export default function AdminApplicationsTable({
  rows,
  locale,
}: {
  rows: AdminApplicationRow[]
  locale: string
}) {
  const t = useTranslations('admin')
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await adminDeleteApplication(id, reason, locale)
      if (res.success) {
        toast.success(t('application_deleted'))
        setOpenId(null)
        setReason('')
        router.refresh()
      } else {
        toast.error(res.error === 'reason_required' ? t('reason_required') : t('action_error'))
      }
    })

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">—</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('applicant')}</TableHead>
          <TableHead>{t('job')}</TableHead>
          <TableHead>{t('filter_status')}</TableHead>
          <TableHead>{t('submitted_date')}</TableHead>
          <TableHead className="text-end">{t('actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.applicant_email}</TableCell>
            <TableCell className="max-w-[220px]">
              <span className="line-clamp-1">{r.job_title}</span>
            </TableCell>
            <TableCell className="capitalize">{r.status}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDate(r.applied_at, locale)}
            </TableCell>
            <TableCell className="text-end">
              {openId === r.id ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('deletion_reason_placeholder')}
                    className="max-w-xs"
                  />
                  <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(r.id)}>
                    {t('confirm_delete')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                    {t('cancel')}
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setOpenId(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
