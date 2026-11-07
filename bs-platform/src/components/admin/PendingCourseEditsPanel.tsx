'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { approveCourseEdit, rejectCourseEdit } from '@/lib/admin/admin-course-actions'

interface PendingCourseEdit {
  id: string
  title: string
  title_ar: string
  price: number
  pending_changes: Record<string, unknown> | null
  pending_submitted_at: string | null
}

/** Report BS-75: admin reviews trainer edits to live (published) courses. */
export default function PendingCourseEditsPanel({
  locale,
  edits,
}: {
  locale: string
  edits: PendingCourseEdit[]
}) {
  const t = useTranslations('admin')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (edits.length === 0) return null
  const isAr = locale === 'ar'

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

  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="text-base">
          {t('pending_course_edits')} ({edits.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('pending_course_edits_hint')}</p>
        {edits.map((edit) => {
          const changes = edit.pending_changes ?? {}
          const newTitle = (isAr ? changes.title_ar : changes.title) as string | undefined
          const newPrice = changes.price as number | undefined
          return (
            <div key={edit.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{(isAr ? edit.title_ar : edit.title) || edit.title}</p>
                  <div className="mt-1 space-y-0.5 text-xs">
                    {newTitle && newTitle !== (isAr ? edit.title_ar : edit.title) && (
                      <p>
                        {t('pending_new_title')}: <span className="font-medium">{newTitle}</span>
                      </p>
                    )}
                    {newPrice !== undefined && Number(newPrice) !== Number(edit.price) && (
                      <p>
                        {t('price_column')}:{' '}
                        <span className="line-through text-muted-foreground">
                          {formatPrice(edit.price)}
                        </span>{' '}
                        → <span className="font-medium">{formatPrice(Number(newPrice))}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    className="gap-1"
                    onClick={() => run(() => approveCourseEdit(edit.id, locale), t('edit_approved'))}
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
                    onClick={() => run(() => rejectCourseEdit(edit.id, reason, locale), t('edit_rejected'))}
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
