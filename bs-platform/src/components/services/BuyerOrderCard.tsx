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
import ServiceReviewModal from '@/components/services/ServiceReviewModal'
import {
  canBuyerCancel,
  getCategoryLabel,
  getOrderStatusLabel,
  orderStatusStyles,
} from '@/lib/services/service-utils'
import { updateOrderStatus } from '@/lib/services/service-actions'
import { formatDate, formatPrice } from '@/lib/utils'
import type { OrderRow } from '@/lib/services/get-orders'

interface BuyerOrderCardProps {
  order: OrderRow
  locale: string
}

export default function BuyerOrderCard({ order, locale }: BuyerOrderCardProps) {
  const t = useTranslations('services')
  const router = useRouter()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isAr = locale === 'ar'
  const sellerName = isAr
    ? order.seller?.full_name_ar ?? order.seller?.full_name
    : order.seller?.full_name
  const serviceTitle = isAr ? order.service.title_ar : order.service.title
  const canCancel =
    order.status === 'pending' && canBuyerCancel(order.ordered_at)

  const confirmReceipt = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, 'completed', locale, 'buyer')
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('receipt_confirmed'))
      if (!order.hasReviewed) setReviewOpen(true)
      router.refresh()
    })
  }

  const cancelOrder = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, 'cancelled', locale, 'buyer')
      if (result.error === 'cancel_not_allowed') {
        toast.error(t('cancel_not_allowed'))
        return
      }
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('order_cancelled'))
      router.refresh()
    })
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={order.seller?.avatar_url ?? undefined} />
                <AvatarFallback>{sellerName?.charAt(0) ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{sellerName}</p>
                <p className="text-sm text-muted-foreground truncate">{serviceTitle}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {getCategoryLabel(order.service.category, locale)}
                </Badge>
              </div>
            </div>
            <Badge className={orderStatusStyles[order.status]}>
              {getOrderStatusLabel(order.status, t)}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
            <span>{formatDate(order.ordered_at, locale)}</span>
            <span className="font-semibold text-foreground">
              {formatPrice(order.service.price)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/orders/${order.id}`}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              {t('view_order')}
            </Link>
            {order.status === 'delivered' && (
              <Button size="sm" disabled={isPending} onClick={confirmReceipt}>
                {t('confirm_receipt')}
              </Button>
            )}
            {order.status === 'completed' && !order.hasReviewed && (
              <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
                {t('leave_review')}
              </Button>
            )}
            {order.status === 'pending' && canCancel && (
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={cancelOrder}
              >
                {t('cancel_order')}
              </Button>
            )}
            {order.status === 'pending' && !canCancel && (
              <p className="text-xs text-muted-foreground">{t('cancel_not_allowed')}</p>
            )}
            {order.seller?.email && (
              <a
                href={`mailto:${order.seller.email}`}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                {t('contact_seller')}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <ServiceReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        serviceId={order.service_id}
        serviceTitle={serviceTitle}
        locale={locale}
      />
    </>
  )
}
