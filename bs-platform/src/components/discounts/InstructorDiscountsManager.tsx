'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Plus, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DiscountCountdown from '@/components/discounts/DiscountCountdown'
import DiscountPercentSlider from '@/components/discounts/DiscountPercentSlider'
import CreateCouponPanel from '@/components/discounts/CreateCouponPanel'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Coupon, CourseDiscount } from '@/types'
import type { InstructorCourseDiscountRow } from '@/lib/discounts/queries'

interface InstructorDiscountsManagerProps {
  locale: string
  courses: InstructorCourseDiscountRow[]
  coupons: Coupon[]
  history: CourseDiscount[]
  maxPercent: number
}

function defaultEndsAt(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default function InstructorDiscountsManager({
  locale,
  courses,
  coupons: initialCoupons,
  history,
  maxPercent,
}: InstructorDiscountsManagerProps) {
  const t = useTranslations('discounts')
  const tCoupons = useTranslations('coupons')
  const router = useRouter()
  const isAr = locale === 'ar'
  const [coupons, setCoupons] = useState(initialCoupons)
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    course_id: '',
    discount_percentage: 10,
    ends_at: defaultEndsAt(7),
    label: '',
    label_ar: '',
  })

  const instructorShare = maxPercent / 100

  const previewEarnings = (coursePrice: number, pct: number) => {
    const finalPrice = Math.round(coursePrice * (1 - pct / 100))
    const instructorGross = Math.round(finalPrice * instructorShare)
    return { finalPrice, instructorGross }
  }

  const courseOptions = courses.map((c) => ({
    id: c.id,
    title: c.title,
    title_ar: c.title_ar,
    price: c.price,
  }))

  const submitDiscount = async () => {
    if (!form.course_id) return
    setLoading(true)
    try {
      const res = await fetch('/api/discounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: form.course_id,
          discount_percentage: form.discount_percentage,
          ends_at: form.ends_at,
          label: form.label || undefined,
          label_ar: form.label_ar || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('already_active'))
        return
      }
      toast.success(t('publish'))
      setExpandedCourseId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const endDiscount = async (id: string) => {
    setLoading(true)
    try {
      await fetch(`/api/discounts/${id}`, { method: 'DELETE' })
      toast.success(t('end_discount'))
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const deactivateCoupon = async (id: string) => {
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    setCoupons((prev) => prev.filter((c) => c.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('active')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const title = isAr ? course.title_ar : course.title
            const expanded = expandedCourseId === course.id
            const preview = previewEarnings(
              course.price,
              expanded ? form.discount_percentage : course.activeDiscount?.discount_percentage ?? 10
            )

            return (
              <Card key={course.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-3">
                    {course.thumbnail_url && (
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded">
                        <Image src={course.thumbnail_url} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium line-clamp-2">{title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(course.price)}
                      </p>
                    </div>
                  </div>

                  {course.activeDiscount ? (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium text-emerald-700">
                        {course.activeDiscount.discount_percentage}% {t('active')}
                      </p>
                      <DiscountCountdown endsAt={course.activeDiscount.ends_at} />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => void endDiscount(course.activeDiscount!.id)}
                      >
                        {t('end_discount')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setForm((f) => ({ ...f, course_id: course.id }))
                        setExpandedCourseId(expanded ? null : course.id)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      {t('create')}
                    </Button>
                  )}

                  {expanded && !course.activeDiscount && (
                    <div className="space-y-3 border-t pt-3">
                      <DiscountPercentSlider
                        label={t('percentage')}
                        value={form.discount_percentage}
                        max={maxPercent}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, discount_percentage: v }))
                        }
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('preview_price')}: {formatPrice(preview.finalPrice)}
                      </p>
                      <p className="text-xs">
                        {t('your_earnings')}: {formatPrice(preview.instructorGross)}
                      </p>
                      {form.discount_percentage >= 60 && (
                        <p className="text-xs text-amber-600">{t('warning_high')}</p>
                      )}
                      <div>
                        <Label>{t('ends_at')}</Label>
                        <Input
                          type="datetime-local"
                          value={form.ends_at.slice(0, 16)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              ends_at: new Date(e.target.value).toISOString(),
                            }))
                          }
                        />
                        {/* Report BS-57: show the chosen expiry in an
                            unambiguous localised format — the raw datetime-local
                            input renders as 09/01/2026, which could be 9 Jan or
                            1 Sep depending on the browser locale. */}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('ends_at')}: {formatDate(form.ends_at, locale)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[1, 3, 7, 14, 30].map((d) => (
                            <Button
                              key={d}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setForm((f) => ({ ...f, ends_at: defaultEndsAt(d) }))
                              }
                            >
                              {d} {t('days')}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button disabled={loading} onClick={() => void submitDiscount()}>
                        {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        {t('publish')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{tCoupons('title')}</h2>
          <Button
            type="button"
            className="gap-1 shrink-0"
            variant={showCouponForm ? 'secondary' : 'default'}
            onClick={() => setShowCouponForm((v) => !v)}
          >
            <Tag className="h-4 w-4" />
            {tCoupons('create')}
          </Button>
        </div>

        {showCouponForm && (
          <CreateCouponPanel
            locale={locale}
            maxPercent={maxPercent}
            courses={courseOptions}
            codePrefix="INST"
            onCreated={(coupon) => {
              setCoupons((prev) => [coupon, ...prev])
              setShowCouponForm(false)
              toast.success(tCoupons('create'))
              router.refresh()
            }}
            onCancel={() => setShowCouponForm(false)}
          />
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tCoupons('code')}</TableHead>
              <TableHead>{tCoupons('scope_course')}</TableHead>
              <TableHead>%</TableHead>
              <TableHead>{tCoupons('current_uses')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {tCoupons('no_coupons')}
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell>
                    {isAr ? c.course?.title_ar : c.course?.title}
                  </TableCell>
                  <TableCell>{c.discount_percentage}%</TableCell>
                  <TableCell>
                    {c.current_uses} / {c.max_uses ?? '—'}
                  </TableCell>
                  <TableCell>
                    {c.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deactivateCoupon(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('history')}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tCoupons('scope_course')}</TableHead>
              <TableHead>%</TableHead>
              <TableHead>{t('starts_at')}</TableHead>
              <TableHead>{t('ends_at')}</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  {isAr ? h.course?.title_ar : h.course?.title}
                </TableCell>
                <TableCell>{h.discount_percentage}%</TableCell>
                <TableCell>{new Date(h.starts_at).toLocaleDateString(locale)}</TableCell>
                <TableCell>{new Date(h.ends_at).toLocaleDateString(locale)}</TableCell>
                <TableCell>{h.is_active ? t('active') : t('expired')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
