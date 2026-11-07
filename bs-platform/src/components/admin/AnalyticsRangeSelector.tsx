'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AnalyticsRange } from '@/lib/admin/get-admin-analytics'

interface AnalyticsRangeSelectorProps {
  locale: string
  current: AnalyticsRange
}

const RANGES: AnalyticsRange[] = ['7d', '30d', '3m', '1y']

export default function AnalyticsRangeSelector({
  locale,
  current,
}: AnalyticsRangeSelectorProps) {
  const t = useTranslations('admin')

  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/${locale}/admin/analytics?range=${range}`}
          className={cn(
            buttonVariants({
              variant: current === range ? 'default' : 'outline',
              size: 'sm',
            })
          )}
        >
          {t(`range_${range}`)}
        </Link>
      ))}
    </div>
  )
}
