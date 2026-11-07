'use client'

import { useMemo, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import { computeSeatPricing, type SeatTier } from '@/lib/company/academy-pricing'

export interface AcademyCourseOption {
  id: string
  title: string
  title_ar: string
  price: number
}

interface Props {
  courses: AcademyCourseOption[]
  tiers: SeatTier[]
}

export default function AcademySeatCalculator({ courses, tiers }: Props) {
  const t = useTranslations('academy')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [seats, setSeats] = useState(10)
  const [pending, startTransition] = useTransition()

  const course = courses.find((c) => c.id === courseId)
  const pricing = useMemo(
    () => computeSeatPricing(course?.price ?? 0, seats, tiers),
    [course?.price, seats, tiers]
  )

  const submit = () => {
    if (!course || pricing.bulkTotal < 1) return
    startTransition(async () => {
      // Report BS-70: real bulk checkout through the payment gateway.
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'academy',
          courseId: course.id,
          seats: pricing.seats,
          method: 'wayl',
          locale,
        }),
      })
      const data = (await res.json()) as { redirectUrl?: string; code?: string; min?: number }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      if (data.code === 'amount_below_minimum') {
        toast.error(t('below_minimum', { min: (data.min ?? 1000).toLocaleString(locale) }))
      } else {
        toast.error(t('request_failed'))
      }
    })
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('no_courses')}</p>
  }

  return (
    <div className="space-y-5 rounded-xl border p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('course')}</Label>
          <Select value={courseId} onValueChange={(v) => v && setCourseId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {isAr ? c.title_ar : c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('seats')}</Label>
          <Input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('normal_total')}</span>
          <span className={pricing.discountPct > 0 ? 'line-through text-muted-foreground' : 'font-semibold'}>
            {formatPrice(pricing.normalTotal)}
          </span>
        </div>
        {pricing.discountPct > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t('bulk_total')} <span className="text-emerald-600">(-{pricing.discountPct}%)</span>
            </span>
            <span className="text-lg font-bold">{formatPrice(pricing.bulkTotal)}</span>
          </div>
        )}
        {pricing.saved > 0 && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {t('you_saved', { amount: formatPrice(pricing.saved), seats: pricing.seats })}
          </div>
        )}
      </div>

      {tiers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('tiers_hint')}{' '}
          {tiers.map((tier) => `${tier.minSeats}+ → -${tier.discountPct}%`).join('  ·  ')}
        </p>
      )}

      <Button onClick={submit} disabled={pending || !course || pricing.bulkTotal < 1}>
        {t('proceed_to_payment', { amount: formatPrice(pricing.bulkTotal) })}
      </Button>
    </div>
  )
}
