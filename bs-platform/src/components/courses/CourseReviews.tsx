'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import StarRating from '@/components/courses/StarRating'
import CourseReviewForm from '@/components/courses/CourseReviewForm'
import { formatDate } from '@/lib/utils'
import type { RatingBreakdown, ReviewWithReviewer } from '@/types/course-detail'

interface CourseReviewsProps {
  locale: string
  courseId: string
  reviews: ReviewWithReviewer[]
  avgRating: number
  reviewCount: number
  ratingBreakdown: RatingBreakdown
  isEnrolled?: boolean
  isInstructor?: boolean
  hasReviewed?: boolean
}

const INITIAL_COUNT = 5

export default function CourseReviews({
  locale,
  courseId,
  reviews,
  avgRating,
  reviewCount,
  ratingBreakdown,
  isEnrolled = false,
  isInstructor = false,
  hasReviewed = false,
}: CourseReviewsProps) {
  const t = useTranslations('courses')
  const isAr = locale === 'ar'
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)

  const visibleReviews = reviews.slice(0, visibleCount)
  const hasMore = reviews.length > visibleCount
  const canWriteReview = isEnrolled && !isInstructor && !hasReviewed

  return (
    <div className="space-y-8">
      {canWriteReview && <CourseReviewForm courseId={courseId} locale={locale} />}

      {hasReviewed && (
        <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 px-4 py-3">
          {t('already_reviewed')}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-xl border p-6 text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {reviewCount > 0 ? avgRating.toFixed(1) : '—'}
          </div>
          <StarRating rating={avgRating} size="md" />
          <p className="text-sm text-muted-foreground mt-2">
            {reviewCount} {t('reviews')}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium mb-3">{t('rating_breakdown')}</p>
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-muted-foreground">{star} ★</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${ratingBreakdown.percentages[star]}%` }}
                />
              </div>
              <span className="w-10 text-end text-muted-foreground text-xs">
                {ratingBreakdown.percentages[star]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {reviewCount === 0 ? (
        <p className="text-muted-foreground text-sm py-2">{t('no_reviews')}</p>
      ) : (
        <ul className="space-y-4">
          {visibleReviews.map((review) => {
            const reviewerName = isAr
              ? review.reviewer?.full_name_ar ?? review.reviewer?.full_name
              : review.reviewer?.full_name

            return (
              <li key={review.id} className="rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.reviewer?.avatar_url ?? ''} />
                    <AvatarFallback className="text-xs">
                      {reviewerName?.charAt(0) ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{reviewerName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.created_at, locale)}
                      </span>
                    </div>
                    <StarRating rating={review.rating} className="mt-1" />
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <Button
          variant="outline"
          onClick={() => setVisibleCount((c) => c + INITIAL_COUNT)}
        >
          {t('load_more_reviews')}
        </Button>
      )}
    </div>
  )
}
