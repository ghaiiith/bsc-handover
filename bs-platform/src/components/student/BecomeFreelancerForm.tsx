'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { submitFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import { submitOnboardingRoleRequest } from '@/lib/onboarding/submit-onboarding-role-request'
import { cn, formatDate } from '@/lib/utils'

interface BecomeFreelancerFormProps {
  locale: string
  existingRequest?: {
    id: string
    status: string
    reason: string | null
    admin_note: string | null
    created_at: string
  } | null
  canSubmitFromOnboarding?: boolean
}

export default function BecomeFreelancerForm({
  locale,
  existingRequest,
  canSubmitFromOnboarding = false,
}: BecomeFreelancerFormProps) {
  const t = useTranslations('become_freelancer')
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  if (existingRequest?.status === 'pending') {
    return (
      <Card>
        <CardContent className="py-8 space-y-3">
          <p className="font-medium">{t('pending_title')}</p>
          <p className="text-sm text-muted-foreground">{t('pending_description')}</p>
          {existingRequest.reason ? (
            <p className="text-sm rounded-lg bg-muted/50 p-3">{existingRequest.reason}</p>
          ) : null}
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
        <CardContent className="py-8 space-y-4">
          <p className="font-medium">{t('approved_title')}</p>
          <p className="text-sm text-muted-foreground">{t('approved_description')}</p>
          <Link href={`/${locale}/dashboard`} className={cn(buttonVariants())}>
            {t('go_to_freelancer_home')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  const handleSubmitFromOnboarding = () => {
    startTransition(async () => {
      const result = await submitOnboardingRoleRequest(locale)
      if (!result.ok) {
        toast.error(t('submit_failed'))
        return
      }
      toast.success(t('submit_success'))
      router.refresh()
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    startTransition(async () => {
      const result = await submitFreelancerRequest(reason, locale)
      if (result.error === 'reason_too_short') {
        toast.error(t('reason_too_short'))
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
        {existingRequest?.status === 'rejected' ? (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="font-medium text-destructive">{t('rejected_title')}</p>
            {existingRequest.admin_note ? (
              <p className="text-sm text-muted-foreground">{existingRequest.admin_note}</p>
            ) : null}
            <p className="text-sm">{t('rejected_retry')}</p>
          </div>
        ) : null}

        {canSubmitFromOnboarding ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('onboarding_prefill_desc')}</p>
            <Button type="button" onClick={handleSubmitFromOnboarding} disabled={isPending}>
              {isPending ? t('submitting') : t('submit_from_onboarding')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                {t('reason_label')}
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('reason_placeholder')}
                rows={6}
                required
                minLength={20}
              />
              <p className="text-xs text-muted-foreground">{t('reason_hint')}</p>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('submitting') : t('submit_btn')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
