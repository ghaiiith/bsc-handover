'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import {
  approveCompanyAffiliationRequest,
  rejectCompanyAffiliationRequest,
} from '@/lib/admin/company-request-actions'
import type { CompanyAffiliationRequestRow } from '@/lib/admin/get-company-requests'

interface CompanyRequestCardProps {
  request: CompanyAffiliationRequestRow
  locale: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
}

export default function CompanyRequestCard({ request, locale }: CompanyRequestCardProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const isAr = locale === 'ar'
  const name = isAr
    ? request.user.full_name_ar ?? request.user.full_name
    : request.user.full_name

  const approve = () => {
    startTransition(async () => {
      const result = await approveCompanyAffiliationRequest(request.id, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('company_approved', { name: result.userName ?? name }))
      router.refresh()
    })
  }

  const reject = () => {
    startTransition(async () => {
      const result = await rejectCompanyAffiliationRequest(request.id, note, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('company_rejected', { name: result.userName ?? name }))
      setRejectOpen(false)
      setNote('')
      router.refresh()
    })
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.user.avatar_url ?? undefined} />
              <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{name}</p>
                <Badge className={statusColors[request.status]}>{request.status}</Badge>
              </div>
              <p className="text-sm font-medium text-primary">{request.company_name}</p>
              <p className="text-sm text-muted-foreground">{request.user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('requested_on', { date: formatDate(request.created_at, locale) })}
              </p>
            </div>
          </div>

          {request.reason && (
            <blockquote className="border-s-4 border-muted ps-3 text-sm italic text-muted-foreground">
              &ldquo;{request.reason}&rdquo;
            </blockquote>
          )}

          {request.admin_note && request.status === 'rejected' && (
            <p className="text-sm text-destructive">
              {t('admin_note')}: {request.admin_note}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {request.status === 'pending' && (
              <>
                <Button size="sm" disabled={isPending} onClick={approve}>
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => setRejectOpen(true)}
                >
                  {t('reject')}
                </Button>
              </>
            )}
            <Link
              href={`/${locale}/admin/users?q=${encodeURIComponent(request.user.email)}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('view_user_profile')}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reject_company_request_title')}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('rejection_reason')}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={reject} disabled={isPending}>
              {t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
