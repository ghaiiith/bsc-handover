'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Pencil, Pause, Play, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import StarRating from '@/components/courses/StarRating'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatPrice } from '@/lib/utils'
import { getCategoryLabel } from '@/lib/services/service-utils'
import { updateServiceStatus } from '@/lib/services/service-actions'
import type { MyServiceRow } from '@/lib/services/get-my-services'

interface MyServiceItemProps {
  service: MyServiceRow
  locale: string
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  deleted: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

export default function MyServiceItem({ service, locale }: MyServiceItemProps) {
  const t = useTranslations('services')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isAr = locale === 'ar'
  const title = isAr ? service.title_ar : service.title

  const runStatus = (status: 'active' | 'paused' | 'deleted') => {
    startTransition(async () => {
      const result = await updateServiceStatus(service.id, status, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('action_success'))
      setDeleteOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold truncate">{title}</h3>
              <Badge variant="secondary">
                {getCategoryLabel(service.category, locale)}
              </Badge>
              <Badge className={statusColors[service.status] ?? statusColors.active}>
                {t(`service_status_${service.status}`)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{formatPrice(service.price)}</span>
              <span>{t('orders_count', { count: service.order_count })}</span>
              {service.review_count > 0 && (
                <span className="flex items-center gap-1">
                  <StarRating rating={service.avg_rating} size="sm" />
                  ({service.review_count})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href={`/${locale}/dashboard/services/${service.id}/edit`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Pencil className="h-4 w-4 me-1" />
              {tCommon('edit')}
            </Link>
            {service.status === 'active' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => runStatus('paused')}
              >
                <Pause className="h-4 w-4 me-1" />
                {t('pause_service')}
              </Button>
            ) : service.status === 'paused' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => runStatus('active')}
              >
                <Play className="h-4 w-4 me-1" />
                {t('resume_service')}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 me-1" />
              {tCommon('delete')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_service_title')}</DialogTitle>
            <DialogDescription>{t('delete_service_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => runStatus('deleted')}
            >
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
