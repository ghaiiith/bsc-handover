'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DiscountPercentSlider from '@/components/discounts/DiscountPercentSlider'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Coupon, CouponScope } from '@/types'

export interface CreateCouponCourseOption {
  id: string
  title: string
  title_ar: string
  price?: number
}

interface CreateCouponPanelProps {
  locale: string
  maxPercent: number
  courses: CreateCouponCourseOption[]
  allowPlatformScope?: boolean
  codePrefix?: string
  onCreated: (coupon: Coupon) => void
  onCancel: () => void
}

function defaultEndsAt(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function generateCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${seg()}-${seg()}`
}

export default function CreateCouponPanel({
  locale,
  maxPercent,
  courses,
  allowPlatformScope = false,
  codePrefix = 'EDU',
  onCreated,
  onCancel,
}: CreateCouponPanelProps) {
  const t = useTranslations('discounts')
  const tCoupons = useTranslations('coupons')
  const tCommon = useTranslations('common')

  // Report BS-56: turn the server's error code into a translated, specific
  // message instead of surfacing a raw code or a generic "Internal error".
  const couponErrorMessage = (code: unknown): string => {
    const map: Record<string, string> = {
      Forbidden: 'error_forbidden',
      course_required: 'error_course_required',
      invalid_percentage: 'error_invalid_percentage',
      instructor_max_exceeded: 'error_instructor_max_exceeded',
      admin_max_exceeded: 'error_admin_max_exceeded',
      invalid_code_format: 'error_invalid_code_format',
      code_exists: 'error_code_exists',
    }
    const key = typeof code === 'string' ? map[code] : undefined
    return key ? tCoupons(key) : tCoupons('error_generic')
  }
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    code: '',
    scope: (allowPlatformScope ? 'platform' : 'course') as CouponScope,
    course_id: courses[0]?.id ?? '',
    discount_percentage: 10,
    max_uses: 50,
    no_expiry: false,
    ends_at: defaultEndsAt(30),
  })

  const selectedCourse = courses.find((c) => c.id === form.course_id)
  const previewPrice =
    selectedCourse?.price != null
      ? Math.round(selectedCourse.price * (1 - form.discount_percentage / 100))
      : null

  const autoGenerateCode = () => {
    setForm((f) => ({ ...f, code: generateCode(codePrefix) }))
  }

  const handleCreate = async () => {
    setError(null)

    if (form.scope === 'course' && !form.course_id) {
      setError(tCoupons('course_required'))
      return
    }

    if (!form.max_uses || form.max_uses < 1) {
      setError(tCoupons('max_uses_required'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/coupons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim() || undefined,
          scope: form.scope,
          course_id: form.scope === 'course' ? form.course_id : undefined,
          discount_percentage: form.discount_percentage,
          max_uses: form.max_uses,
          ends_at: form.no_expiry ? null : form.ends_at,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(couponErrorMessage(data.error))
        return
      }
      onCreated(data.coupon as Coupon)
    } catch {
      setError(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{tCoupons('create')}</CardTitle>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="coupon-code">{tCoupons('code')}</Label>
          <div className="flex gap-2">
            <Input
              id="coupon-code"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder={tCoupons('code')}
              className="uppercase font-mono"
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={autoGenerateCode}
              disabled={loading}
            >
              {tCoupons('auto_generate')}
            </Button>
          </div>
        </div>

        {allowPlatformScope && (
          <div className="space-y-2">
            <Label>{tCoupons('scope_label')}</Label>
            <Select
              value={form.scope}
              onValueChange={(v) =>
                v &&
                setForm((f) => ({
                  ...f,
                  scope: v as CouponScope,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">{tCoupons('scope_platform')}</SelectItem>
                <SelectItem value="course">{tCoupons('scope_course')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(form.scope === 'course' || !allowPlatformScope) && (
          <div className="space-y-2">
            <Label>{tCoupons('scope_course')}</Label>
            <Select
              value={form.course_id}
              onValueChange={(v) => v && setForm((f) => ({ ...f, course_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={tCoupons('select_course')} />
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
        )}

        <DiscountPercentSlider
          label={t('percentage')}
          value={form.discount_percentage}
          max={maxPercent}
          onChange={(v) => setForm((f) => ({ ...f, discount_percentage: v }))}
          disabled={loading}
        />

        {previewPrice != null && selectedCourse && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {isAr ? selectedCourse.title_ar : selectedCourse.title}:{' '}
            <span className="line-through">{formatPrice(selectedCourse.price!)}</span>
            {' → '}
            <span className="font-semibold text-foreground">
              {formatPrice(previewPrice)}
            </span>
            {' '}
            <span className="text-emerald-600">({form.discount_percentage}%)</span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="max-uses">{tCoupons('max_uses')}</Label>
          <Input
            id="max-uses"
            type="number"
            min={1}
            step={1}
            value={form.max_uses}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                max_uses: Math.max(1, parseInt(e.target.value, 10) || 1),
              }))
            }
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">{tCoupons('max_uses_hint')}</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{tCoupons('no_expiry')}</p>
          </div>
          <Switch
            checked={form.no_expiry}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, no_expiry: checked }))
            }
            disabled={loading}
          />
        </div>

        {!form.no_expiry && (
          <div className="space-y-2">
            <Label htmlFor="coupon-ends">{t('ends_at')}</Label>
            <Input
              id="coupon-ends"
              type="datetime-local"
              value={form.ends_at.slice(0, 16)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  ends_at: new Date(e.target.value).toISOString(),
                }))
              }
              disabled={loading}
            />
            {/* Report BS-57: unambiguous localised expiry (not 09/01/2026). */}
            <p className="text-xs text-muted-foreground">
              {formatDate(form.ends_at, locale)}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" disabled={loading} onClick={() => void handleCreate()}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {tCoupons('create')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {tCommon('cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
