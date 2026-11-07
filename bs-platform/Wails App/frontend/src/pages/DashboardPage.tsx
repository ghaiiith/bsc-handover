import { useEffect, useState } from 'react'
import { cms } from '@/lib/cms'
import { api } from '@/lib/wails'
import type { DashboardStats, ActivityEntry } from '@/types'
import type { CourseListResponse } from '@/types/cms'
import { PageHeader } from '@/components/admin/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [courseStats, setCourseStats] = useState<CourseListResponse['stats'] | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  useEffect(() => {
    void refresh()
  }, [])

  const refresh = async () => {
    try {
      const [s, a, courses] = await Promise.all([
        api.GetDashboardStats(),
        api.GetActivity(8),
        cms.listCourses({ pageSize: '1' }),
      ])
      setStats(s)
      setActivity(a ?? [])
      setCourseStats(courses.stats)
    } catch {
      /* ignore */
    }
  }

  const cards = [
    ...(courseStats
      ? [
          { label: 'Published courses', value: courseStats.published },
          { label: 'Pending review', value: courseStats.pending },
          { label: 'Draft courses', value: courseStats.draft },
        ]
      : []),
    ...(stats
      ? [
          { label: 'Total lessons', value: stats.totalLessons },
          { label: 'Videos ready', value: stats.videosReady },
          { label: 'Queue active', value: stats.queueActive },
        ]
      : []),
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader title="Overview" description="Platform administration and content production." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-2 text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold">Recent activity</h3>
          <ul className="mt-4 space-y-2">
            {activity.length === 0 && (
              <li className="text-sm text-muted-foreground">No activity yet.</li>
            )}
            {activity.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 text-sm">
                <span className={entry.level === 'error' ? 'text-destructive' : 'text-foreground'}>
                  {entry.message}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
