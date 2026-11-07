'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import StarRating from '@/components/courses/StarRating'
import { formatDate } from '@/lib/utils'
import type { ReviewWithReviewer } from '@/lib/services/get-service-detail'
import type { RatingBreakdown } from '@/lib/services/get-service-detail'

interface ServiceReviewsProps {
  locale: string
  reviews: ReviewWithReviewer[]
  avgRating: number
  reviewCount: number
  ratingBreakdown: RatingBreakdown
}

export default function ServiceReviews({
  locale,
  reviews,
  avgRating,
  reviewCount,
  ratingBreakdown,
}: ServiceReviewsProps) {
  const t = useTranslations('services')
  const [visible, setVisible] = useState(5)
  const isAr = locale === 'ar'
  const shown = reviews.slice(0, visible)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t('customer_reviews')}</h2>

      {reviewCount === 0 ? (
        <p className="text-sm text-muted-foreground">{t('no_reviews')}</p>
      ) : (
        <>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
              <StarRating rating={avgRating} />
            </div>
            <div className="flex-1 space-y-1">
              {([5, 4, 3, 2, 1] as const).map((star) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3">{star}</span>
                  <Progress
                    value={ratingBreakdown.percentages[star]}
                    className="h-2 flex-1"
                  />
                  <span className="w-8 text-muted-foreground">
                    {ratingBreakdown.percentages[star]}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {shown.map((review) => {
              const name = isAr
                ? review.reviewer?.full_name_ar ?? review.reviewer?.full_name
                : review.reviewer?.full_name
              return (
                <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.reviewer?.avatar_url ?? ''} />
                      <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <StarRating rating={review.rating} />
                    </div>
                    <span className="text-xs text-muted-foreground ms-auto">
                      {formatDate(review.created_at, locale)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              )
            })}
          </div>

          {visible < reviews.length && (
            <Button variant="outline" onClick={() => setVisible((v) => v + 5)}>
              {t('load_more_reviews')}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
