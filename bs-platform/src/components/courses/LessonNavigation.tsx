'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import { useLessonPlayer } from '@/components/courses/LessonPlayerProvider'

interface LessonNavigationProps {
  previousLessonSlug?: string
  nextLessonSlug?: string
}

export default function LessonNavigation({
  previousLessonSlug,
  nextLessonSlug,
}: LessonNavigationProps) {
  const t = useTranslations('courses')
  const { locale, courseSlug } = useLessonPlayer()
  const isRtl = locale === 'ar'

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      {previousLessonSlug ? (
        <Link
          href={buildLearnLessonPath(locale, courseSlug, previousLessonSlug)}
          scroll={false}
          prefetch
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
        >
          {isRtl ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          {t('previous_lesson')}
        </Link>
      ) : (
        <div />
      )}

      {nextLessonSlug ? (
        <Link
          href={buildLearnLessonPath(locale, courseSlug, nextLessonSlug)}
          scroll={false}
          prefetch
          className={cn(buttonVariants(), 'gap-2 ms-auto')}
        >
          {t('next_lesson')}
          {isRtl ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Link>
      ) : null}
    </div>
  )
}
