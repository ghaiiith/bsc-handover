'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Smartphone, CreditCard, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatPrice } from '@/lib/utils'
import type { PaymentMethod } from '@/types'

type PaymentMethodModalProps =
  | {
      open: boolean
      onOpenChange: (open: boolean) => void
      type?: 'course'
      courseId: string
      courseTitle: string
      price: number
      locale: string
      couponCode?: string
      onSuccess?: () => void
    }
  | {
      open: boolean
      onOpenChange: (open: boolean) => void
      type: 'service'
      productId: string
      productTitle: string
      price: number
      locale: string
      requirements: string
      onSuccess?: () => void
    }

const methods: {
  id: PaymentMethod
  icon: typeof Smartphone
  nameAr: string
  nameEn: string
  descKey: 'zaincash_desc' | 'qicard_desc' | 'wayl_desc'
}[] = [
  {
    id: 'wayl',
    icon: CreditCard,
    nameAr: 'الدفع الإلكتروني',
    nameEn: 'Online Payment',
    descKey: 'wayl_desc',
  },
]

export default function PaymentMethodModal(props: PaymentMethodModalProps) {
  const t = useTranslations('payment')
  const tCommon = useTranslations('common')
  const tCoupons = useTranslations('coupons')
  const [selected, setSelected] = useState<PaymentMethod | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [couponInput, setCouponInput] = useState(props.type === 'service' ? '' : props.couponCode ?? '')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(
    props.type === 'service' ? null : props.couponCode ?? null
  )
  const [couponLoading, setCouponLoading] = useState(false)
  const [displayPrice, setDisplayPrice] = useState(props.price)
  const [couponError, setCouponError] = useState<string | null>(null)

  const isAr = props.locale === 'ar'
  const isService = props.type === 'service'
  const title = isService ? props.productTitle : props.courseTitle
  const price = displayPrice

  const handleClose = (nextOpen: boolean) => {
    if (!isProcessing) {
      if (!nextOpen) {
        setSelected(null)
        setError(null)
      }
      props.onOpenChange(nextOpen)
    }
  }

  const handleApplyCoupon = async () => {
    if (isService) return
    const code = couponInput.trim()
    if (!code) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, courseId: props.courseId }),
      })
      const data = await res.json()
      if (!data.coupon_valid) {
        setCouponError(data.coupon_error ?? tCoupons('invalid'))
        setAppliedCoupon(null)
        setDisplayPrice(props.price)
        return
      }
      setAppliedCoupon(code.toUpperCase())
      setDisplayPrice(Math.round(Number(data.final_price)))
    } catch {
      setCouponError(tCoupons('invalid'))
    } finally {
      setCouponLoading(false)
    }
  }

  const handleProceed = async () => {
    if (!selected) return

    setIsProcessing(true)
    setError(null)

    try {
      const body = isService
        ? {
            type: 'service' as const,
            serviceId: props.productId,
            requirements: props.requirements,
            method: selected,
            locale: props.locale,
          }
        : {
            type: 'course' as const,
            courseId: props.courseId,
            method: selected,
            locale: props.locale,
            couponCode: appliedCoupon ?? undefined,
          }

      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as {
        redirectUrl?: string
        enrolled?: boolean
        skipped?: boolean
        orderId?: string
        error?: string
        code?: string
        min?: number
      }

      if (!response.ok) {
        if (data.code === 'already_enrolled' || data.code === 'active_order_exists') {
          setError(
            isService ? t('active_order_exists') : t('already_enrolled')
          )
        } else if (data.code === 'amount_below_minimum') {
          // Report BS-55: tell the buyer the real reason + the actual minimum.
          setError(
            t('amount_below_minimum', {
              min: (data.min ?? 1000).toLocaleString(props.locale),
            })
          )
        } else {
          // Report BS-55: every server code gets a REAL message — a generic
          // "try again" for a permanent condition (own course, unavailable,
          // gateway not configured…) is a silent stop from the buyer's side.
          const codeMap: Record<string, string> = {
            no_revenue_agreement: 'err_no_revenue_agreement',
            gateway_not_configured: 'err_gateway_not_configured',
            own_course: 'err_own_course',
            own_service: 'err_own_service',
            course_not_available: 'err_course_not_available',
            course_not_found: 'err_course_not_available',
            service_not_available: 'err_service_not_available',
            service_not_found: 'err_service_not_available',
            order_create_failed: 'err_order_create_failed',
            payment_create_failed: 'err_payment_create_failed',
            purchase_create_failed: 'err_payment_create_failed',
            enrollment_failed: 'err_payment_create_failed',
            rate_limited: 'err_rate_limited',
            invalid_request: 'err_invalid_request',
            forbidden: 'err_forbidden',
            unauthorized: 'err_unauthorized',
            coupon_invalid: 'err_coupon_invalid',
            coupon_expired: 'err_coupon_expired',
            coupon_already_used: 'err_coupon_already_used',
            coupon_max_reached: 'err_coupon_max_reached',
          }
          const key = data.code ? codeMap[data.code] : undefined
          setError(key ? t(key) : t('gateway_error'))
        }
        setIsProcessing(false)
        return
      }

      if (data.skipped && data.orderId) {
        props.onOpenChange(false)
        props.onSuccess?.()
        window.location.href = `/${props.locale}/dashboard/orders/${data.orderId}`
        return
      }

      if (data.enrolled) {
        props.onOpenChange(false)
        props.onSuccess?.()
        window.location.reload()
        return
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }

      setError(t('gateway_error'))
      setIsProcessing(false)
    } catch {
      setError(t('gateway_error'))
      setIsProcessing(false)
    }
  }

  const handleSkipPayment = async () => {
    if (!isService) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'service',
          serviceId: props.productId,
          requirements: props.requirements,
          locale: props.locale,
          skipPayment: true,
        }),
      })

      const data = (await response.json()) as {
        skipped?: boolean
        orderId?: string
        code?: string
      }

      if (!response.ok) {
        if (data.code === 'active_order_exists') {
          setError(t('active_order_exists'))
        } else {
          setError(t('gateway_error'))
        }
        setIsProcessing(false)
        return
      }

      if (data.skipped && data.orderId) {
        props.onOpenChange(false)
        props.onSuccess?.()
        window.location.href = `/${props.locale}/dashboard/orders/${data.orderId}`
        return
      }

      setError(t('gateway_error'))
      setIsProcessing(false)
    } catch {
      setError(t('gateway_error'))
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('select_method')}</DialogTitle>
          <DialogDescription className="line-clamp-2">{title}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{formatPrice(price)}</p>
          {!isService && appliedCoupon && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
              <Check className="h-3 w-3" />
              {tCoupons('applied')} ({appliedCoupon})
            </p>
          )}
        </div>

        {!isService && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{tCoupons('have_coupon')}</p>
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder={tCoupons('code')}
                disabled={isProcessing || couponLoading}
                className="uppercase"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleApplyCoupon()}
                disabled={isProcessing || couponLoading || !couponInput.trim()}
              >
                {couponLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  tCoupons('apply')
                )}
              </Button>
            </div>
            {couponError && (
              <p className="text-xs text-destructive">{couponError}</p>
            )}
          </div>
        )}

        <div className="grid gap-3">
          {methods.map((method) => {
            const Icon = method.icon
            const isSelected = selected === method.id

            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelected(method.id)}
                disabled={isProcessing}
                className={cn(
                  'flex items-center gap-4 rounded-xl border-2 p-4 text-start transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">
                    {isAr ? method.nameAr : method.nameEn}
                    {!isAr && (
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        / {method.nameAr}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(method.descKey)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {isService && process.env.NODE_ENV !== 'production' && (
          <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">{t('skip_payment_note')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isProcessing}
              onClick={() => void handleSkipPayment()}
            >
              {isProcessing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('skip_payment')}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {t('redirect_note')}
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isProcessing}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleProceed}
            disabled={!selected || isProcessing}
          >
            {isProcessing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isProcessing ? t('processing') : t('proceed')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
