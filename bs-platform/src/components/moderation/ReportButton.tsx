'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { submitReport, type ReportReason, type ReportTargetType } from '@/lib/moderation/reports'

const REASONS: ReportReason[] = [
  'spam',
  'inappropriate',
  'misleading',
  'scam',
  'harassment',
  'copyright',
  'other',
]

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  className?: string
}

export default function ReportButton({ targetType, targetId, className }: ReportButtonProps) {
  const t = useTranslations('report')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await submitReport(targetType, targetId, reason, details)
      if (!res.success) {
        toast.error(res.error === 'already_reported' ? t('already_reported') : t('error'))
        return
      }
      toast.success(t('submitted'))
      setOpen(false)
      setDetails('')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-destructive'
        }
      >
        <Flag className="h-3.5 w-3.5" />
        {t('report')}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('reason')}</label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  reason === r
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {t(`reason_${r}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('details')}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t('details_placeholder')}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
          >
            {pending ? t('submitting') : t('submit')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
