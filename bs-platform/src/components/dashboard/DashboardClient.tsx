'use client'

import RecommendedCoursesSection from '@/components/recommendations/RecommendedCoursesSection'

interface DashboardClientProps {
  locale: string
  hasPreferences: boolean
}

export default function DashboardClient({
  locale,
  hasPreferences,
}: DashboardClientProps) {
  return <RecommendedCoursesSection locale={locale} hasPreferences={hasPreferences} />
}
