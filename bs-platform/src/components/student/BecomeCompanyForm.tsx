'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { cn, formatDate } from '@/lib/utils'

interface BecomeCompanyFormProps {
  locale: string
  existingRequest?: {
    id: string
    status: string
    company_name: string
    company_name_ar?: string | null
    reason: string | null
    admin_note: string | null
    created_at: string
  } | null
}

export default function BecomeCompanyForm({ locale, existingRequest }: BecomeCompanyFormProps) {
  const t = useTranslations('company_affiliation')
  const router = useRouter()
  const [companyName, setCompanyName] = useState(existingRequest?.company_name ?? '')
  const [companyNameAr, setCompanyNameAr] = useState(existingRequest?.company_name_ar ?? '')
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  if (existingRequest?.status === 'pending') {
    return (
      <Card>
        <CardContent className="space-y-3 py-8">
          <p className="font-medium">{t('pending_title')}</p>
          <p className="text-sm text-muted-foreground">{t('pending_description')}</p>
          <p className="text-sm font-medium">{existingRequest.company_name}</p>
          {existingRequest.reason && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm">{existingRequest.reason}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('submitted_on', { date: formatDate(existingRequest.created_at, locale) })}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (existingRequest?.status === 'approved') {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <p className="font-medium">{t('approved_title')}</p>
          <p className="text-sm text-muted-foreground">{t('approved_description')}</p>
          <Link href={`/${locale}/dashboard/company-jobs`} className={cn(buttonVariants())}>
            {t('go_to_company_jobs')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await submitCompanyAffiliationRequest(
        companyName,
        companyNameAr,
        reason,
        locale
      )

      if (result.error === 'company_name_required') {
        toast.error(t('company_name_required'))
        return
      }
      if (result.error === 'reason_too_short') {
        toast.error(t('reason_too_short'))
        return
      }
      if (result.error === 'pending_exists') {
        toast.error(t('pending_exists'))
        router.refresh()
        return
      }
      if (result.error === 'already_company') {
        toast.error(t('already_company'))
        router.refresh()
        return
      }
      if (!result.success) {
        toast.error(t('submit_failed'))
        return
      }

      toast.success(t('submit_success'))
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="py-8">
        {existingRequest?.status === 'rejected' && (
          <div className="mb-6 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-medium text-destructive">{t('rejected_title')}</p>
            {existingRequest.admin_note && (
              <p className="text-sm text-muted-foreground">{existingRequest.admin_note}</p>
            )}
            <p className="text-sm">{t('rejected_retry')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="company_name" className="text-sm font-medium">
              {t('company_name_label')}
            </label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="company_name_ar" className="text-sm font-medium">
              {t('company_name_ar_label')}
            </label>
            <Input
              id="company_name_ar"
              value={companyNameAr}
              onChange={(e) => setCompanyNameAr(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              {t('reason_label')}
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              required
              minLength={20}
              placeholder={t('reason_placeholder')}
            />
            <p className="text-xs text-muted-foreground">{t('reason_hint')}</p>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t('submitting') : t('submit_btn')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
