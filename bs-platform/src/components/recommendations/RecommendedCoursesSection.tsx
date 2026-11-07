'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { HelpCircle, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import RecommendedCourseCard from '@/components/recommendations/RecommendedCourseCard'
import type { CourseListItem } from '@/lib/courses/list-courses'

interface RecommendedCoursesSectionProps {
  locale: string
  hasPreferences: boolean
}

interface RecResponse {
  courses: CourseListItem[]
  reasons: Record<string, string>
  basedOn: string[]
}

export default function RecommendedCoursesSection({
  locale,
  hasPreferences,
}: RecommendedCoursesSectionProps) {
  const t = useTranslations('recommendations')
  const [loading, setLoading] = useState(hasPreferences)
  const [data, setData] = useState<RecResponse | null>(null)
  const [showWhy, setShowWhy] = useState(false)

  const fetchRecs = useCallback(async () => {
    if (!hasPreferences) return
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations/courses', { method: 'POST' })
      if (res.ok) {
        const json = (await res.json()) as RecResponse
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [hasPreferences])

  useEffect(() => {
    void fetchRecs()
  }, [fetchRecs])

  if (!hasPreferences) {
    return null
  }

  if (loading) {
    return (
      <section className="mb-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  if (!data?.courses.length) {
    return (
      <section className="mb-8 rounded-xl border bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">{t('complete_profile')}</p>
        <Link href={`/${locale}/dashboard/profile`} className="text-sm text-primary hover:underline mt-2 inline-block">
          {t('complete_profile_link')}
        </Link>
      </section>
    )
  }

  const displayCourses = data.courses.slice(0, 3)

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          {data.basedOn.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {t('based_on')}: {data.basedOn.join('، ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowWhy((v) => !v)}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {t('why_recommended')}
          </button>
          <Link href={`/${locale}/courses?recommended=true`} className="text-sm text-primary hover:underline">
            {t('see_all')}
          </Link>
        </div>
      </div>

      {showWhy && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          {t('why_explanation')}
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {displayCourses.map((course) => (
          <RecommendedCourseCard
            key={course.id}
            course={course}
            locale={locale}
            reason={data.reasons[course.id]}
          />
        ))}
      </div>
    </section>
  )
}
