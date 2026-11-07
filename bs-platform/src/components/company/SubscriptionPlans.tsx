'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, cn } from '@/lib/utils'

export interface PlanView {
  id: string
  name: string
  name_ar: string | null
  job_quota: number
  price: number
  currency: string
  duration_days: number
  // Round 9 (BS-106): admin-maintained description + the plan's feature map.
  tier?: 'free' | 'professional' | 'enterprise' | null
  description?: string | null
  description_ar?: string | null
  jobs_per_month?: number | null
  features?: {
    ai_matching: boolean
    ai_chatbot: 'none' | 'limited' | 'full'
    hr_chatbot: boolean
    featured_jobs: boolean
    email_alerts: boolean
  }
}

interface SubscriptionPlansProps {
  plans: PlanView[]
  currentPlanId: string | null
  currentPeriodEnd: string | null
  /** Report BS-38: admin-granted free months still available to this company. */
  freeMonthsRemaining?: number
}

export default function SubscriptionPlans({
  plans,
  currentPlanId,
  currentPeriodEnd,
  freeMonthsRemaining = 0,
}: SubscriptionPlansProps) {
  const t = useTranslations('subscription')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const subscribe = async (planId: string) => {
    setLoadingId(planId)
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', planId, method: 'wayl', locale }),
      })
      const data = (await res.json()) as {
        redirectUrl?: string
        subscribed?: boolean
        code?: string
        activeUntil?: string
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      if (data.subscribed) {
        toast.success(t('activated'))
        router.refresh()
        return
      }
      // BS-99: downgrading is refused while paid days remain, so say why and
      // when the paid plan ends rather than showing a bare error.
      if (data.code === 'paid_plan_active') {
        toast.error(
          t('paid_plan_active', {
            date: data.activeUntil
              ? new Date(data.activeUntil).toLocaleDateString(locale)
              : '',
          })
        )
        return
      }
      toast.error(t('error'))
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {freeMonthsRemaining > 0 && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
          {t('free_months_banner', { count: freeMonthsRemaining })}
        </div>
      )}

      {currentPlanId && currentPeriodEnd && (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          {t('current_until', { date: new Date(currentPeriodEnd).toLocaleDateString(locale) })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId
          const name = (isAr ? plan.name_ar : plan.name) || plan.name
          // The offer is only meaningful on a plan that normally costs money.
          const isFreeOffer = freeMonthsRemaining > 0 && plan.price > 0
          return (
            <Card key={plan.id} className={cn(isCurrent && 'border-primary ring-1 ring-primary')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{name}</CardTitle>
                  {isCurrent && <Badge>{t('current')}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {isFreeOffer ? (
                    <span className="flex flex-wrap items-baseline gap-2">
                      <s className="text-lg text-muted-foreground">{formatPrice(plan.price)}</s>
                      <span className="text-2xl font-bold text-primary">{t('free')}</span>
                    </span>
                  ) : (
                    <span className="text-2xl font-bold">
                      {plan.price === 0 ? t('free') : formatPrice(plan.price)}
                    </span>
                  )}
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {' '}
                      / {plan.duration_days} {t('days')}
                    </span>
                  )}
                </div>
                {/* Round 9 (BS-106): the description the admin maintains. */}
                {(isAr ? plan.description_ar : plan.description) && (
                  <p className="text-sm text-muted-foreground">
                    {(isAr ? plan.description_ar : plan.description) as string}
                  </p>
                )}
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    {plan.jobs_per_month === null || plan.jobs_per_month === undefined
                      ? t('jobs_unlimited')
                      : t('jobs_per_month_line', { count: plan.jobs_per_month })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    {t('duration_line', { days: plan.duration_days })}
                  </li>
                  {plan.features && (
                    <>
                      <li className="flex items-center gap-2">
                        {plan.features.ai_matching ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-muted-foreground/60" />
                        )}
                        <span className={cn(!plan.features.ai_matching && 'text-muted-foreground')}>
                          {t('feature_matching')}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.features.ai_chatbot === 'full' ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-muted-foreground/60" />
                        )}
                        <span className={cn(plan.features.ai_chatbot !== 'full' && 'text-muted-foreground')}>
                          {plan.features.ai_chatbot === 'full' ? t('feature_chatbot_full') : t('feature_chatbot_limited')}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.features.hr_chatbot ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-muted-foreground/60" />
                        )}
                        <span className={cn(!plan.features.hr_chatbot && 'text-muted-foreground')}>
                          {t('feature_hr_chatbot')}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.features.featured_jobs ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-muted-foreground/60" />
                        )}
                        <span className={cn(!plan.features.featured_jobs && 'text-muted-foreground')}>
                          {t('feature_featured')}
                        </span>
                      </li>
                    </>
                  )}
                </ul>
                <Button
                  className="w-full"
                  disabled={isCurrent || loadingId !== null}
                  onClick={() => void subscribe(plan.id)}
                >
                  {loadingId === plan.id && <Loader2 className="me-2 size-4 animate-spin" />}
                  {isCurrent
                    ? t('current')
                    : isFreeOffer
                      ? t('start_free')
                      : plan.price === 0
                        ? t('choose')
                        : t('subscribe')}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
