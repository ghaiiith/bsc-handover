'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OrderStatusFilter } from '@/lib/services/get-orders'

interface OrderStatusFilterProps {
  locale: string
  basePath: string
  current: OrderStatusFilter
}

const STATUSES: OrderStatusFilter[] = [
  'all',
  'pending',
  'in_progress',
  'delivered',
  'completed',
  'cancelled',
]

export default function OrderStatusFilterTabs({
  locale,
  basePath,
  current,
}: OrderStatusFilterProps) {
  const t = useTranslations('services')

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((status) => {
        const href =
          status === 'all'
            ? `/${locale}${basePath}`
            : `/${locale}${basePath}?status=${status}`
        const isActive = current === status
        return (
          <Link
            key={status}
            href={href}
            className={cn(
              buttonVariants({
                variant: isActive ? 'default' : 'outline',
                size: 'sm',
              })
            )}
          >
            {t(`filter_${status}`)}
          </Link>
        )
      })}
    </div>
  )
}
