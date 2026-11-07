'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RecommendedCourseCard from '@/components/recommendations/RecommendedCourseCard'
import type { CourseListItem } from '@/lib/courses/list-courses'

interface CoursesRecommendationsSectionProps {
  locale: string
  isLoggedIn: boolean
  hasPreferences: boolean
}

const COLLAPSED_KEY = 'eduwork_recs_collapsed'

interface RecResponse {
  courses: CourseListItem[]
  reasons: Record<string, string>
  basedOn: string[]
}

export default function CoursesRecommendationsSection({
  locale,
  isLoggedIn,
  hasPreferences,
}: CoursesRecommendationsSectionProps) {
  const t = useTranslations('recommendations')
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState<RecResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true')
    } catch {
      /* ignore */
    }
  }, [])

  const fetchRecs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations/courses', { method: 'POST' })
      if (res.ok) setData((await res.json()) as RecResponse)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) void fetchRecs()
  }, [isLoggedIn, fetchRecs])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  // Gating this on completed onboarding hid the section from nearly every
  // account (most users never finish the preferences step), so the courses page
  // looked broken next to the jobs page. Recommend from whatever the profile
  // has — the engine falls back to popularity — and hide only when empty.
  if (!isLoggedIn) return null
  if (!loading && !data?.courses.length) return null

  return (
    <div className="mb-8 rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 p-4 hover:bg-muted/30 transition-colors"
        onClick={toggleCollapsed}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('courses_page_title')}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
          {!loading && data?.courses.length ? (
            <>
              <div className="flex gap-4 overflow-x-auto snap-x pb-2">
                {data.courses.map((course) => (
                  <RecommendedCourseCard
                    key={course.id}
                    course={course}
                    locale={locale}
                    reason={data.reasons[course.id]}
                    showReasonBelow
                  />
                ))}
              </div>
              {!hasPreferences && (
                <p className="text-xs text-muted-foreground">{t('complete_profile')}</p>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={toggleCollapsed}>
                {t('hide')}
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
