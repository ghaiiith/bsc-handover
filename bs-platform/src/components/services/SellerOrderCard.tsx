'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getDaysUntilDelivery,
  getOrderStatusLabel,
  orderStatusStyles,
} from '@/lib/services/service-utils'
import { updateOrderStatus } from '@/lib/services/service-actions'
import { formatDate } from '@/lib/utils'
import type { OrderRow } from '@/lib/services/get-orders'

interface SellerOrderCardProps {
  order: OrderRow
  locale: string
}

export default function SellerOrderCard({ order, locale }: SellerOrderCardProps) {
  const t = useTranslations('services')
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isAr = locale === 'ar'
  const buyerName = isAr
    ? order.buyer?.full_name_ar ?? order.buyer?.full_name
    : order.buyer?.full_name
  const serviceTitle = isAr ? order.service.title_ar : order.service.title
  const daysLeft = getDaysUntilDelivery(
    order.ordered_at,
    order.service.delivery_days
  )

  const runAction = (status: 'in_progress' | 'delivered') => {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, status, locale, 'seller')
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('action_success'))
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={order.buyer?.avatar_url ?? undefined} />
              <AvatarFallback>{buyerName?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{buyerName}</p>
              <p className="text-sm text-muted-foreground truncate">{serviceTitle}</p>
            </div>
          </div>
          <Badge className={orderStatusStyles[order.status]}>
            {getOrderStatusLabel(order.status, t)}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>{formatDate(order.ordered_at, locale)}</span>
          <span>
            {t('delivery_deadline', {
              days: daysLeft > 0 ? daysLeft : 0,
            })}
          </span>
        </div>

        {order.requirements && (
          <div className="text-sm">
            <p className={expanded ? '' : 'line-clamp-2'}>{order.requirements}</p>
            {order.requirements.length > 120 && (
              <button
                type="button"
                className="text-primary text-xs mt-1 hover:underline"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? t('show_less') : t('show_more')}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/dashboard/orders/${order.id}`}
            className={buttonVariants({ size: 'sm' })}
          >
            {t('view_order')}
          </Link>
          {order.status === 'pending' && (
            <Button size="sm" disabled={isPending} onClick={() => runAction('in_progress')}>
              {t('accept_order')}
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button size="sm" disabled={isPending} onClick={() => runAction('delivered')}>
              {t('mark_delivered')}
            </Button>
          )}
          {order.status === 'delivered' && (
            <p className="text-sm text-muted-foreground">{t('waiting_buyer')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
