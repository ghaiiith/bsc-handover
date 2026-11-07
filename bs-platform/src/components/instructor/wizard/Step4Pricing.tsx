'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { step4Schema, type Step4FormValues } from '@/lib/instructor/course-wizard-schemas'
import {
  saveCourseStep4,
  submitCourseForReview,
} from '@/lib/instructor/course-wizard-actions'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

interface Step4PricingProps {
  locale: string
  courseId: string
  defaultPrice?: number
  onBack?: () => void
  standalone?: boolean
  platformCommissionPct?: number
}

export default function Step4Pricing({
  locale,
  courseId,
  defaultPrice = 0,
  onBack,
  standalone = false,
  platformCommissionPct = 30,
}: Step4PricingProps) {
  const t = useTranslations('instructor')
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch } = useForm<Step4FormValues>({
    resolver: zodResolver(step4Schema),
    defaultValues: { price: defaultPrice },
  })

  const price = watch('price') ?? 0
  const earnings = Math.round(Number(price) * (1 - platformCommissionPct / 100))

  const onSubmit = async (values: Step4FormValues) => {
    setSubmitting(true)

    const saveResult = await saveCourseStep4(courseId, values.price, locale)
    if (!saveResult.success) {
      setSubmitting(false)
      toast.error(t('save_error'))
      return
    }

    const submitResult = await submitCourseForReview(courseId, locale)
    setSubmitting(false)

    if (!submitResult.success) {
      toast.error(t('save_error'))
      return
    }

    toast.success(t('submit_success'))
    router.push(`/${locale}/instructor/courses/${courseId}/studio`)
  }

  const handleSavePrice = async () => {
    setSaving(true)
    const saveResult = await saveCourseStep4(courseId, price, locale)
    setSaving(false)

    if (!saveResult.success) {
      toast.error(t('save_error'))
      return
    }

    toast.success(t('course_save_success'))
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="price">{t('price_iqd')}</Label>
        <Input
          id="price"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          {...register('price', { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground">
          {Number(price) === 0 ? t('free_course_hint') : t('commission_hint', {
            commission: platformCommissionPct,
            earnings: formatPrice(earnings),
          })}
        </p>
      </div>

      <div className={`flex pt-4 gap-2 ${standalone ? 'justify-end' : 'justify-between'}`}>
        {!standalone && onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            {t('back_step')}
          </Button>
        )}
        {standalone && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSavePrice}
            disabled={saving || submitting}
          >
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('save_changes')}
          </Button>
        )}
        <Button type="submit" disabled={submitting || saving}>
          {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t('submit_for_review')}
        </Button>
      </div>
    </form>
  )
}
