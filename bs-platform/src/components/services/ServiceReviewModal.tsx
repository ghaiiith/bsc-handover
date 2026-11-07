'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitServiceReview } from '@/lib/services/service-actions'
import { cn } from '@/lib/utils'

interface ServiceReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string
  serviceTitle: string
  locale: string
  onSuccess?: () => void
}

export default function ServiceReviewModal({
  open,
  onOpenChange,
  serviceId,
  serviceTitle,
  locale,
  onSuccess,
}: ServiceReviewModalProps) {
  const t = useTranslations('services')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (rating < 1) return

    startTransition(async () => {
      const result = await submitServiceReview(
        serviceId,
        rating,
        comment.trim() || undefined,
        locale
      )
      if (result.error === 'already_reviewed') {
        toast.error(t('already_reviewed'))
        return
      }
      if (!result.success) {
        toast.error(t('review_error'))
        return
      }
      toast.success(t('review_submitted'))
      onOpenChange(false)
      setRating(0)
      setComment('')
      onSuccess?.()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rate_service')}</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-2">{serviceTitle}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <Star
                  className={cn(
                    'h-8 w-8 transition-colors',
                    (hover || rating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>{t('review_comment')}</Label>
            <Textarea
              rows={4}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('review_placeholder')}
            />
            <p className="text-xs text-end text-muted-foreground">{comment.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={rating < 1 || isPending}>
            {t('submit_review')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
