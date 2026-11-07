'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ServiceReviewModal from '@/components/services/ServiceReviewModal'
import {
  canBuyerCancel,
  getCategoryGradient,
  getCategoryLabel,
  getOrderStatusLabel,
  orderStatusStyles,
} from '@/lib/services/service-utils'
import { updateOrderStatus } from '@/lib/services/service-actions'
import type { ServiceOrderDetail } from '@/lib/services/get-orders'
import type { OrderStatus } from '@/types'
import { cn, formatDate, formatPrice } from '@/lib/utils'

interface ServiceOrderDetailProps {
  order: ServiceOrderDetail
  locale: string
}

const TIMELINE: OrderStatus[] = [
  'pending',
  'in_progress',
  'delivered',
  'completed',
]

function timelineIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  return TIMELINE.indexOf(status)
}

export default function ServiceOrderDetailView({
  order,
  locale,
}: ServiceOrderDetailProps) {
  const t = useTranslations('services')
  const router = useRouter()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isAr = locale === 'ar'
  const isBuyer = order.role === 'buyer'
  const isSeller = order.role === 'seller'
  const serviceTitle = isAr ? order.service.title_ar : order.service.title
  const serviceDescription = isAr
    ? order.service.description_ar
    : order.service.description
  const counterparty = isBuyer ? order.seller : order.buyer
  const counterpartyName = isAr
    ? counterparty?.full_name_ar ?? counterparty?.full_name
    : counterparty?.full_name
  const portfolioImage = order.service.portfolio_images?.[0]
  const gradient = getCategoryGradient(order.service.category)
  const currentStep = timelineIndex(order.status)
  const canCancel =
    isBuyer && order.status === 'pending' && canBuyerCancel(order.ordered_at)
  const showPortfolio =
    counterparty?.portfolio_slug &&
    counterparty.portfolio_is_public !== false

  const runStatusUpdate = (
    status: OrderStatus,
    role: 'buyer' | 'seller',
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, status, locale, role)
      if (result.error === 'cancel_not_allowed') {
        toast.error(t('cancel_not_allowed'))
        return
      }
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      if (status === 'cancelled') toast.success(t('order_cancelled'))
      else if (status === 'completed') toast.success(t('receipt_confirmed'))
      else toast.success(t('action_success'))
      onSuccess?.()
      router.refresh()
    })
  }

  return (
    <>
      <div className="space-y-6">
        <Link
          href={order.backHref}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'gap-1.5 -ms-2 text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowLeft className="size-4" />
          {isBuyer ? t('my_orders') : t('incoming_orders')}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('order_detail_id', { id: order.id.slice(0, 8).toUpperCase() })}
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {serviceTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatDate(order.ordered_at, locale)}
              </span>
              <Badge variant="secondary">
                {getCategoryLabel(order.service.category, locale)}
              </Badge>
            </div>
          </div>
          <Badge className={cn('self-start text-sm px-3 py-1', orderStatusStyles[order.status])}>
            {getOrderStatusLabel(order.status, t)}
          </Badge>
        </div>

        {order.status !== 'cancelled' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('order_timeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 sm:grid-cols-4">
                {TIMELINE.map((step, index) => {
                  const done = currentStep >= index
                  const active = currentStep === index
                  return (
                    <li
                      key={step}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-sm transition-colors',
                        done
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-muted/20 text-muted-foreground',
                        active && 'ring-2 ring-primary/20'
                      )}
                    >
                      <p className="font-medium text-foreground">
                        {getOrderStatusLabel(step, t)}
                      </p>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden">
              <div className={cn('relative aspect-[21/9] bg-gradient-to-br', gradient)}>
                {portfolioImage ? (
                  <Image
                    src={portfolioImage}
                    alt={serviceTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                ) : null}
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(order.service.price)}
                  </p>
                  <Link
                    href={`/${locale}/services/${order.service.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                  >
                    {t('view_service')}
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{t('delivery_days')}</p>
                    <p className="mt-1 font-semibold">
                      {order.service.delivery_days} {t('days')}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{t('order_deadline')}</p>
                    <p className="mt-1 font-semibold">
                      {formatDate(order.deliveryDeadline, locale)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'rounded-lg border p-3',
                      order.isDeliveryOverdue
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'bg-muted/30'
                    )}
                  >
                    <p className="text-xs text-muted-foreground">{t('time_remaining')}</p>
                    <p
                      className={cn(
                        'mt-1 font-semibold inline-flex items-center gap-1',
                        order.isDeliveryOverdue && 'text-destructive'
                      )}
                    >
                      <Clock className="size-3.5" />
                      {order.status === 'completed' || order.status === 'cancelled'
                        ? '—'
                        : order.isDeliveryOverdue
                          ? t('delivery_overdue')
                          : t('delivery_deadline', {
                              days: Math.max(order.daysUntilDelivery, 0),
                            })}
                    </p>
                  </div>
                </div>

                <p className="line-clamp-4 text-sm text-muted-foreground">
                  {serviceDescription}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('requirements_label')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {order.requirements || t('no_requirements')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('order_actions')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {isSeller && order.status === 'pending' && (
                  <Button
                    disabled={isPending}
                    onClick={() => runStatusUpdate('in_progress', 'seller')}
                  >
                    {t('accept_order')}
                  </Button>
                )}
                {isSeller && order.status === 'in_progress' && (
                  <Button
                    disabled={isPending}
                    onClick={() => runStatusUpdate('delivered', 'seller')}
                  >
                    {t('mark_delivered')}
                  </Button>
                )}
                {isSeller && order.status === 'delivered' && (
                  <p className="text-sm text-muted-foreground">{t('waiting_buyer')}</p>
                )}

                {isBuyer && order.status === 'delivered' && (
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      runStatusUpdate('completed', 'buyer', () => {
                        if (!order.hasReviewed) setReviewOpen(true)
                      })
                    }
                  >
                    {t('confirm_receipt')}
                  </Button>
                )}
                {isBuyer && order.status === 'completed' && !order.hasReviewed && (
                  <Button variant="outline" onClick={() => setReviewOpen(true)}>
                    {t('leave_review')}
                  </Button>
                )}
                {isBuyer && canCancel && (
                  <Button
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => runStatusUpdate('cancelled', 'buyer')}
                  >
                    {t('cancel_order')}
                  </Button>
                )}
                {isBuyer && order.status === 'pending' && !canCancel && (
                  <p className="text-sm text-muted-foreground">{t('cancel_not_allowed')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isBuyer ? t('seller_details') : t('buyer_details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={counterparty?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {counterpartyName?.charAt(0) ?? <User className="size-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{counterpartyName ?? '—'}</p>
                    {counterparty?.headline && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {counterparty.headline}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <dl className="space-y-3 text-sm">
                  {counterparty?.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">{t('email_label')}</dt>
                        <dd>
                          <a
                            href={`mailto:${counterparty.email}`}
                            className="break-all text-primary hover:underline"
                          >
                            {counterparty.email}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}
                  {counterparty?.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <dt className="text-xs text-muted-foreground">{t('phone_label')}</dt>
                        <dd>
                          <a
                            href={`tel:${counterparty.phone}`}
                            className="text-primary hover:underline"
                          >
                            {counterparty.phone}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}
                  {counterparty?.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <dt className="text-xs text-muted-foreground">{t('location_label')}</dt>
                        <dd>{counterparty.location}</dd>
                      </div>
                    </div>
                  )}
                </dl>

                <div className="flex flex-col gap-2 pt-1">
                  {counterparty?.email && (
                    <a
                      href={`mailto:${counterparty.email}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
                    >
                      {isBuyer ? t('contact_seller') : t('contact_buyer')}
                    </a>
                  )}
                  {showPortfolio && (
                    <Link
                      href={`/${locale}/portfolio/${counterparty.portfolio_slug}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
                    >
                      {t('view_profile')}
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('order_summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t('order_placed')}</span>
                  <span className="font-medium">{formatDate(order.ordered_at, locale)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t('price_iqd')}</span>
                  <span className="font-semibold">{formatPrice(order.service.price)}</span>
                </div>
                {order.payment && (
                  <>
                    <Separator />
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{t('payment_status')}</span>
                      <Badge variant="secondary" className="capitalize">
                        {order.payment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{t('payment_method')}</span>
                      <span className="font-medium capitalize">{order.payment.method}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isBuyer && (
        <ServiceReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          serviceId={order.service_id}
          serviceTitle={serviceTitle}
          locale={locale}
        />
      )}
    </>
  )
}
