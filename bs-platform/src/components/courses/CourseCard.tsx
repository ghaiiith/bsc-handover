'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import StarRating from '@/components/courses/StarRating'
import { formatPrice } from '@/lib/utils'
import { THUMBNAIL_BLUR_DATA_URL } from '@/lib/seo/blur-placeholder'
import { formatDurationMinutes } from '@/lib/courses/format-duration'
import type { CourseListItem } from '@/lib/courses/list-courses'
import type { CourseLevel } from '@/types'

interface CourseCardProps {
  course: CourseListItem
  locale: string
}

const levelStyles: Record<CourseLevel, string> = {
  beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

export default function CourseCard({ course, locale }: CourseCardProps) {
  const t = useTranslations('courses')
  const isAr = locale === 'ar'

  const title = isAr ? course.title_ar : course.title
  const instructorName = isAr
    ? course.instructor?.full_name_ar ?? course.instructor?.full_name
    : course.instructor?.full_name

  const durationLabels = {
    minutes: t('minutes'),
    hours: t('hours'),
    hour: t('hour'),
  }
  const hasSale =
    course.sale_price != null &&
    course.price > 0 &&
    course.sale_price < course.price

  const levelLabel = {
    beginner: t('level_beginner'),
    intermediate: t('level_intermediate'),
    advanced: t('level_advanced'),
  }[course.level]

  return (
    <Link href={`/${locale}/courses/${course.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={THUMBNAIL_BLUR_DATA_URL}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary/5">
              <BookOpen className="h-12 w-12 text-primary/40" />
            </div>
          )}
          {course.price === 0 ? (
            <Badge className="absolute top-2 start-2 bg-emerald-600 text-white hover:bg-emerald-600">
              {t('free')}
            </Badge>
          ) : hasSale && course.discount_percent_off ? (
            <Badge className="absolute top-2 start-2 bg-rose-600 text-white hover:bg-rose-600">
              {t('percent_off', { percent: course.discount_percent_off })}
            </Badge>
          ) : null}
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge className={levelStyles[course.level]} variant="secondary">
              {levelLabel}
            </Badge>
            <StarRating
              rating={course.avg_rating}
              showCount
              count={course.review_count}
            />
          </div>

          <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
            {title}
          </h3>

          {course.instructor && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={course.instructor.avatar_url ?? ''} />
                <AvatarFallback className="text-[10px]">
                  {course.instructor.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {instructorName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {course.total_lessons} {t('lessons')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDurationMinutes(course.total_duration_minutes, durationLabels)}
            </span>
          </div>

          <div className="pt-1">
            {course.price === 0 ? (
              <span className="font-bold text-emerald-600">{t('free')}</span>
            ) : hasSale ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-primary">
                  {formatPrice(course.sale_price!)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(course.price)}
                </span>
              </div>
            ) : (
              <span className="font-bold text-primary">{formatPrice(course.price)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
