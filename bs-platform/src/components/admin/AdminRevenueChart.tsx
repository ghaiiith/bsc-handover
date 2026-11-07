'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import type { RevenueChartPoint } from '@/lib/admin/get-admin-overview'

interface AdminRevenueChartProps {
  data: RevenueChartPoint[]
  locale: string
}

export default function AdminRevenueChart({ data, locale }: AdminRevenueChartProps) {
  const t = useTranslations('admin')
  const isAr = locale === 'ar'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('revenue_chart_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5)}
                className="text-xs"
              />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat(isAr ? 'ar-IQ' : 'en-US', {
                    notation: 'compact',
                  }).format(v)
                }
                className="text-xs"
              />
              <Tooltip
                formatter={(value) => formatPrice(Number(value ?? 0))}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name={t('platform_commission')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
