'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  updateReportStatus,
  type ContentReport,
  type ReportStatus,
} from '@/lib/moderation/reports'

const STATUS_TONE: Record<ReportStatus, string> = {
  open: 'bg-amber-500/10 text-amber-600',
  reviewing: 'bg-blue-500/10 text-blue-600',
  resolved: 'bg-green-500/10 text-green-600',
  dismissed: 'bg-muted text-muted-foreground',
}

export default function AdminReportsClient({
  locale,
  initialReports,
}: {
  locale: string
  initialReports: ContentReport[]
}) {
  const t = useTranslations('report')
  const [reports, setReports] = useState(initialReports)
  const [pending, startTransition] = useTransition()

  function setStatus(id: string, status: ReportStatus) {
    startTransition(async () => {
      const res = await updateReportStatus(id, status, locale)
      if (!res.success) {
        toast.error(t('error'))
        return
      }
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      toast.success(t('status_updated'))
    })
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">{t('no_reports')}</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t(`target_${r.target_type}`)}</Badge>
                <Badge variant="secondary">{t(`reason_${r.reason}`)}</Badge>
                <Badge className={STATUS_TONE[r.status]}>{t(`status_${r.status}`)}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.reporter?.full_name ?? '—'}
              </span>
            </div>

            {r.details ? (
              <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{r.details}</p>
            ) : null}

            <p className="font-mono text-xs text-muted-foreground">
              {r.target_type}:{r.target_id}
            </p>

            <div className="flex flex-wrap gap-2">
              {(['reviewing', 'resolved', 'dismissed'] as ReportStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending || r.status === s}
                  onClick={() => setStatus(r.id, s)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  {t(`action_${s}`)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
