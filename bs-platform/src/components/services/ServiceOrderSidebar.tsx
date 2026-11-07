'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Clock, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import OrderRequirementsModal from '@/components/services/OrderRequirementsModal'
import { formatPrice } from '@/lib/utils'
import { splitDescriptionBullets } from '@/lib/services/service-utils'
import { cn } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceOrderSidebarProps {
  locale: string
  service: Service & { portfolio_images?: string[] }
  isLoggedIn: boolean
  isSeller: boolean
  activeOrder?: { id: string; status: string }
}

export default function ServiceOrderSidebar({
  locale,
  service,
  isLoggedIn,
  isSeller,
  activeOrder,
}: ServiceOrderSidebarProps) {
  const t = useTranslations('services')
  const router = useRouter()
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isAr = locale === 'ar'
  const title = isAr ? service.title_ar : service.title
  const description = isAr ? service.description_ar : service.description
  const bullets = splitDescriptionBullets(description)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success(t('link_copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('load_error'))
    }
  }

  const renderOrderButton = (compact = false) => {
    const btnClass = compact ? undefined : 'w-full'

    if (isSeller) {
      return (
        <Button size="lg" className={btnClass} disabled>
          {t('this_is_your_service')}
        </Button>
      )
    }

    if (activeOrder) {
      return (
        <Link
          href={`/${locale}/dashboard/orders/${activeOrder.id}`}
          className={cn(buttonVariants({ size: 'lg' }), btnClass)}
        >
          {t('view_order')}
        </Link>
      )
    }

    if (!isLoggedIn) {
      return (
        <Link
          href={`/${locale}/login`}
          className={cn(buttonVariants({ size: 'lg' }), btnClass)}
        >
          {t('order_now')}
        </Link>
      )
    }

    return (
      <Button size="lg" className={btnClass} onClick={() => setRequirementsOpen(true)}>
        {t('order_now')}
      </Button>
    )
  }

  return (
    <>
      <Card className="lg:sticky lg:top-20 shadow-md">
        <CardContent className="space-y-5 p-5">
          <p className="font-semibold line-clamp-2">{title}</p>

          <p className="text-3xl font-bold text-primary">
            {formatPrice(service.price)}
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t('delivered_in')} {service.delivery_days} {t('days')}
          </div>

          {bullets.length > 0 && (
            <ul className="space-y-2 text-sm">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span className="line-clamp-2">{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {renderOrderButton()}

          <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4" />
            {copied ? t('link_copied') : t('share')}
          </Button>
        </CardContent>
      </Card>

      <OrderRequirementsModal
        open={requirementsOpen}
        onOpenChange={setRequirementsOpen}
        service={service}
        locale={locale}
        onSuccess={() => router.refresh()}
      />

      <div className="mobile-sticky-cta lg:hidden">
        <div className="container mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium line-clamp-1">{title}</p>
            <p className="text-lg font-bold text-primary num-en">{formatPrice(service.price)}</p>
          </div>
          <div className="shrink-0 [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap">
            {renderOrderButton(true)}
          </div>
        </div>
      </div>
    </>
  )
}
