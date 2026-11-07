'use client'

import { useTranslations } from 'next-intl'
import CourseCard from '@/components/courses/CourseCard'
import { Badge } from '@/components/ui/badge'
import type { CourseListItem } from '@/lib/courses/list-courses'

interface RecommendedCourseCardProps {
  course: CourseListItem
  locale: string
  reason?: string
  showReasonBelow?: boolean
}

export default function RecommendedCourseCard({
  course,
  locale,
  reason,
  showReasonBelow = false,
}: RecommendedCourseCardProps) {
  const t = useTranslations('recommendations')

  return (
    <div className="relative shrink-0 w-[280px] sm:w-auto snap-start">
      <div className="absolute top-2 start-2 z-10">
        <Badge
          className="bg-cyan-600 hover:bg-cyan-600 text-white text-[10px]"
          title={reason}
        >
          {t('badge')}
        </Badge>
      </div>
      <CourseCard course={course} locale={locale} />
      {showReasonBelow && reason && (
        <p className="text-xs text-muted-foreground mt-2 px-1 line-clamp-2">{reason}</p>
      )}
    </div>
  )
}
