'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StudioAnalytics } from '@/lib/instructor/studio/get-course-studio-data'
import { formatCount, formatCompactNumber } from '@/lib/format-number'

interface StudioAnalyticsChartsProps {
  data: StudioAnalytics
}

export default function StudioAnalyticsCharts({ data }: StudioAnalyticsChartsProps) {
  const t = useTranslations('studio.analytics')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('enrollments_chart')}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.enrollmentsByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('revenue_chart')}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactNumber(v)} />
              <Tooltip />
              <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('top_students')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topStudents.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>{s.name}</span>
              <span className="font-medium num-en">{formatCount(s.progress)}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('needs_attention')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.bottomStudents.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>{s.name}</span>
              <span className="font-medium text-warning num-en">{formatCount(s.progress)}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
