'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PriceCalculation } from '@/types'

interface CourseCouponFieldProps {
  courseId: string
  disabled?: boolean
  onApplied: (code: string | null, pricing: PriceCalculation) => void
  onClear?: () => void
}

export default function CourseCouponField({
  courseId,
  disabled,
  onApplied,
  onClear,
}: CourseCouponFieldProps) {
  const t = useTranslations('coupons')
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleApply = async () => {
    const trimmed = code.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, courseId }),
      })
      const data = (await res.json()) as PriceCalculation & {
        coupon_valid?: boolean
        coupon_error?: string
        coupon_error_code?: string
      }

      if (!res.ok && res.status === 429) {
        setError(t('rate_limited'))
        onClear?.()
        return
      }

      if (!data.coupon_valid) {
        const codeKey = data.coupon_error_code ?? 'invalid'
        const message =
          codeKey === 'expired'
            ? t('expired')
            : codeKey === 'already_used'
              ? t('already_used')
              : codeKey === 'max_reached'
                ? t('max_reached')
                : t('invalid')
        setError(message)
        onClear?.()
        return
      }

      setSuccess(true)
      onApplied(trimmed.toUpperCase(), data)
    } catch {
      setError(t('invalid'))
      onClear?.()
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (value: string) => {
    setCode(value.toUpperCase())
    if (success || error) {
      setSuccess(false)
      setError(null)
      onClear?.()
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        <span>{t('have_coupon')}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleApply()
                }
              }}
              placeholder={t('code')}
              disabled={disabled || loading}
              className="uppercase"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleApply()}
              disabled={disabled || loading || !code.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('apply')
              )}
            </Button>
          </div>
          {success && (
            <p className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              {t('applied')}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}
