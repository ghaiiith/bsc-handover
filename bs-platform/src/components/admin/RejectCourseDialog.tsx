'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { rejectCourse } from '@/lib/admin/admin-course-actions'

const rejectFormSchema = z.object({
  reason: z.string().min(10),
})

type RejectFormValues = z.infer<typeof rejectFormSchema>

interface RejectCourseDialogProps {
  locale: string
  courseId: string | null
  courseTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RejectCourseDialog({
  locale,
  courseId,
  courseTitle,
  open,
  onOpenChange,
}: RejectCourseDialogProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: { reason: '' },
  })

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = (values: RejectFormValues) => {
    if (!courseId) return

    setError(null)
    startTransition(async () => {
      const result = await rejectCourse(courseId, values.reason, locale)
      if (result.error) {
        setError(t('action_error'))
        return
      }
      handleClose(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reject_title')}</DialogTitle>
          <DialogDescription>{t('reject_description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm font-medium line-clamp-2">{courseTitle}</p>

          <div className="space-y-2">
            <Label htmlFor="rejection-reason">{t('rejection_reason')}</Label>
            <Textarea
              id="rejection-reason"
              rows={4}
              {...register('reason')}
              disabled={isPending}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">
                {t('rejection_reason_required')}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? t('rejecting') : t('reject')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
