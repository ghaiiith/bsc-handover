'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { approveJobEdit, rejectJobEdit } from '@/lib/jobs/admin-job-actions'

interface PendingEdit {
  id: string
  title: string
  title_ar: string
  company_name: string
  pending_changes: Record<string, unknown> | null
  pending_submitted_at: string | null
}

/** Report BS-53: admin reviews company edits to live jobs. */
export default function PendingJobEditsPanel({
  locale,
  edits,
}: {
  locale: string
  edits: PendingEdit[]
}) {
  const t = useTranslations('admin')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (edits.length === 0) return null

  const run = (fn: () => Promise<{ success?: boolean; error?: string }>, msg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (!res.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(msg)
      setRejectId(null)
      setReason('')
      router.refresh()
    })
  }

  const isAr = locale === 'ar'

  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="text-base">
          {t('pending_job_edits')} ({edits.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('pending_job_edits_hint')}</p>
        {edits.map((edit) => {
          const changes = edit.pending_changes ?? {}
          const newTitle = (isAr ? changes.title_ar : changes.title) as string | undefined
          return (
            <div key={edit.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {(isAr ? edit.title_ar : edit.title) || edit.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{edit.company_name}</p>
                  {newTitle && newTitle !== (isAr ? edit.title_ar : edit.title) && (
                    <p className="mt-1 text-xs">
                      {t('pending_new_title')}: <span className="font-medium">{newTitle}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    className="gap-1"
                    onClick={() => run(() => approveJobEdit(edit.id, locale), t('edit_approved'))}
                  >
                    <Check className="h-4 w-4" />
                    {t('approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    className="gap-1"
                    onClick={() => setRejectId(rejectId === edit.id ? null : edit.id)}
                  >
                    <X className="h-4 w-4" />
                    {t('reject')}
                  </Button>
                </div>
              </div>
              {rejectId === edit.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('reject_reason_placeholder')}
                    className="max-w-sm"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      run(() => rejectJobEdit(edit.id, reason, locale), t('edit_rejected'))
                    }
                  >
                    {t('confirm_reject')}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
