'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ExternalLink, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import StarRating from '@/components/courses/StarRating'
import { getCategoryLabel } from '@/lib/services/service-utils'
import {
  adminUpdateServiceStatus,
  approveService,
  rejectService,
} from '@/lib/admin/admin-service-actions'
import { formatPrice, cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { AdminServiceRow } from '@/lib/admin/get-admin-services'

interface AdminServicesTableProps {
  locale: string
  services: AdminServiceRow[]
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-800',
  deleted: 'bg-rose-100 text-rose-800',
  pending: 'bg-blue-100 text-blue-800',
  rejected: 'bg-rose-100 text-rose-800',
}

export default function AdminServicesTable({
  locale,
  services,
}: AdminServicesTableProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const isAr = locale === 'ar'

  const runStatus = (id: string, status: 'active' | 'paused' | 'deleted') => {
    startTransition(async () => {
      const result = await adminUpdateServiceStatus(id, status, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('action_success'))
      setDeleteId(null)
      router.refresh()
    })
  }

  const runApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveService(id, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('action_success'))
      router.refresh()
    })
  }

  const runReject = () => {
    if (!rejectId) return
    startTransition(async () => {
      const result = await rejectService(rejectId, rejectReason, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('action_success'))
      setRejectId(null)
      setRejectReason('')
      router.refresh()
    })
  }

  if (services.length === 0) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">{t('no_services')}</p>
        <Link
          href={`/${locale}/admin/services/new`}
          className={cn(buttonVariants(), 'gap-2')}
        >
          {t('create_service')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('service_title')}</TableHead>
            <TableHead>{t('seller_column')}</TableHead>
            <TableHead>{t('category_column')}</TableHead>
            <TableHead>{t('price_column')}</TableHead>
            <TableHead>{t('orders_column')}</TableHead>
            <TableHead>{t('rating_column')}</TableHead>
            <TableHead>{t('filter_status')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const title = isAr ? service.title_ar : service.title
            const sellerName = isAr
              ? service.seller.full_name_ar ?? service.seller.full_name
              : service.seller.full_name

            return (
              <TableRow key={service.id}>
                <TableCell className="font-medium max-w-[180px] line-clamp-2">
                  {title}
                </TableCell>
                <TableCell className="text-sm">{sellerName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getCategoryLabel(service.category, locale)}
                  </Badge>
                </TableCell>
                <TableCell>{formatPrice(service.price)}</TableCell>
                <TableCell>{service.order_count}</TableCell>
                <TableCell>
                  {service.avg_rating > 0 ? (
                    <StarRating rating={service.avg_rating} size="sm" />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[service.status]}>
                    {service.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Link
                      href={`/${locale}/admin/services/${service.id}/edit`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {tCommon('edit')}
                    </Link>
                    <Link
                      href={`/${locale}/services/${service.id}`}
                      target="_blank"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    {(service.status === 'pending' || service.status === 'rejected') && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => runApprove(service.id)}
                      >
                        {t('approve_service')}
                      </Button>
                    )}
                    {service.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setRejectId(service.id)}
                      >
                        {t('reject_service')}
                      </Button>
                    )}
                    {service.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runStatus(service.id, 'paused')}
                      >
                        {t('pause_service')}
                      </Button>
                    )}
                    {service.status === 'paused' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runStatus(service.id, 'active')}
                      >
                        {t('reactivate_service')}
                      </Button>
                    )}
                    {service.status !== 'deleted' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => setDeleteId(service.id)}
                      >
                        {tCommon('delete')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_service_title')}</DialogTitle>
            <DialogDescription>{t('delete_service_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => deleteId && runStatus(deleteId, 'deleted')}
            >
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null)
            setRejectReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reject_service')}</DialogTitle>
            <DialogDescription>{t('reject_service_desc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('reject_reason_placeholder')}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectId(null)
                setRejectReason('')
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || rejectReason.trim().length < 3}
              onClick={runReject}
            >
              {t('reject_service')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
