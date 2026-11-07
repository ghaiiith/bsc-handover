'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'

interface CourseRecommendedBannerProps {
  courseId: string
  hasPreferences: boolean
}

export default function CourseRecommendedBanner({
  courseId,
  hasPreferences,
}: CourseRecommendedBannerProps) {
  const t = useTranslations('recommendations')
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    if (!hasPreferences) return
    void fetch('/api/recommendations/courses', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { courses?: { id: string }[]; reasons?: Record<string, string> } | null) => {
        if (!data?.courses) return
        const found = data.courses.some((c) => c.id === courseId)
        if (found && data.reasons?.[courseId]) {
          setReason(data.reasons[courseId])
        }
      })
      .catch(() => {})
  }, [courseId, hasPreferences])

  if (!reason) return null

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex gap-3">
      <Sparkles className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm">{t('recommended_for_you')}</p>
        <p className="text-sm text-muted-foreground mt-1">{reason}</p>
      </div>
    </div>
  )
}
