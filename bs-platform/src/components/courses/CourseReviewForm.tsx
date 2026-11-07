'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitCourseReview } from '@/lib/courses/review-actions'
import { cn } from '@/lib/utils'

interface CourseReviewFormProps {
  courseId: string
  locale: string
}

export default function CourseReviewForm({ courseId, locale }: CourseReviewFormProps) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (rating < 1) return

    startTransition(async () => {
      const result = await submitCourseReview(
        courseId,
        rating,
        comment.trim() || undefined,
        locale
      )

      if (result.error === 'not_authenticated') {
        router.push(`/${locale}/login`)
        return
      }
      if (result.error === 'already_reviewed') {
        toast.error(t('already_reviewed'))
        return
      }
      if (result.error === 'not_enrolled') {
        toast.error(t('review_enroll_required'))
        return
      }
      if (!result.success) {
        toast.error(t('review_error'))
        return
      }

      toast.success(t('review_submitted'))
      setRating(0)
      setComment('')
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold">{t('write_review')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('write_review_hint')}</p>
      </div>

      <div className="flex justify-center gap-1 sm:justify-start">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${star}`}
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
        <Label htmlFor="course-review-comment">{t('review_comment')}</Label>
        <Textarea
          id="course-review-comment"
          rows={4}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('review_placeholder')}
        />
        <p className="text-xs text-end text-muted-foreground">{comment.length}/500</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRating(0)
            setComment('')
          }}
          disabled={pending}
        >
          {tCommon('cancel')}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={rating < 1 || pending}>
          {t('submit_review')}
        </Button>
      </div>
    </div>
  )
}
