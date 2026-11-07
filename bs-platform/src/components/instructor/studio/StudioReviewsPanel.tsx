'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import StarRating from '@/components/courses/StarRating'
import { replyToReview } from '@/lib/instructor/studio/studio-actions'
import type { StudioReviewRow } from '@/lib/instructor/studio/get-course-studio-data'
import { formatCount } from '@/lib/format-number'
import { toast } from 'sonner'

interface StudioReviewsPanelProps {
  locale: string
  courseId: string
  reviews: StudioReviewRow[]
  averageRating: number
  distribution: number[]
}

export default function StudioReviewsPanel({
  locale,
  courseId,
  reviews: initialReviews,
  averageRating,
  distribution,
}: StudioReviewsPanelProps) {
  const t = useTranslations('studio.reviews')
  const isAr = locale === 'ar'
  const [reviews, setReviews] = useState(initialReviews)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const handleReply = (reviewId: string) => {
    const reply = replyDraft[reviewId]?.trim()
    if (!reply) return
    startTransition(async () => {
      const result = await replyToReview(reviewId, courseId, reply, locale)
      if (!result.success) {
        toast.error(t('reply_error'))
        return
      }
      setReviews(
        reviews.map((r) =>
          r.id === reviewId
            ? { ...r, instructor_reply: reply, instructor_reply_at: new Date().toISOString() }
            : r
        )
      )
      toast.success(t('reply_saved'))
    })
  }

  const total = distribution.reduce((a, b) => a + b, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="edu-card p-6 shadow-none lg:col-span-1">
        <p className="text-sm text-muted-foreground">{t('average')}</p>
        <p className="mt-1 text-4xl font-bold num-en">
          {averageRating > 0 ? averageRating.toFixed(1) : '—'}
        </p>
        <StarRating rating={Math.round(averageRating)} className="mt-2" />
        <div className="mt-6 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1] ?? 0
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3 num-en">{star}</span>
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-end text-muted-foreground num-en">
                  {formatCount(count)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground">{t('empty')}</p>
        ) : (
          reviews.map((review) => {
            const name = isAr
              ? review.reviewer?.full_name_ar ?? review.reviewer?.full_name
              : review.reviewer?.full_name
            return (
              <div key={review.id} className="edu-card p-5 shadow-none">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{name}</p>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>
                )}
                {review.instructor_reply && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-medium text-primary mb-1">{t('your_reply')}</p>
                    {review.instructor_reply}
                  </div>
                )}
                {!review.instructor_reply && (
                  <div className="mt-4 space-y-2">
                    <Textarea
                      rows={2}
                      placeholder={t('reply_placeholder')}
                      value={replyDraft[review.id] ?? ''}
                      onChange={(e) =>
                        setReplyDraft({ ...replyDraft, [review.id]: e.target.value })
                      }
                    />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={pending}
                      onClick={() => handleReply(review.id)}
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                      {t('reply')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
