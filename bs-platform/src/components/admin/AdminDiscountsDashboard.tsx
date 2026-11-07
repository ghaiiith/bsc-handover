'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatPrice } from '@/lib/utils'
import CreateCouponPanel from '@/components/discounts/CreateCouponPanel'
import DiscountPercentSlider from '@/components/discounts/DiscountPercentSlider'
import AdminInstructorCommissions from '@/components/admin/AdminInstructorCommissions'
import SplitBar from '@/components/admin/SplitBar'
import type { CourseDiscount, PriceCalculation } from '@/types'
import type { InstructorCommissionRow } from '@/lib/discounts/queries'

interface AdminDiscountsDashboardProps {
  locale: string
  activeDiscounts: CourseDiscount[]
  overview: Array<{
    course_id: string
    course?: CourseDiscount['course']
    admin_pct: number
    instructor_pct: number
    pricing?: PriceCalculation
  }>
  coupons: Array<Record<string, unknown>>
  logs: Array<Record<string, unknown>>
  publishedCourses: Array<{
    id: string
    title: string
    title_ar: string
    price: number
    instructor_id: string | null
  }>
  maxPercent: number
  instructors: InstructorCommissionRow[]
  defaultInstructorPct: number
}

function defaultEndsAt(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default function AdminDiscountsDashboard({
  locale,
  activeDiscounts,
  overview,
  coupons,
  logs,
  publishedCourses,
  maxPercent,
  instructors,
  defaultInstructorPct,
}: AdminDiscountsDashboardProps) {
  const t = useTranslations('discounts')
  const tCoupons = useTranslations('coupons')
  const tOffers = useTranslations('offers')
  const router = useRouter()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [discountForm, setDiscountForm] = useState({
    instructor_id: '',
    course_id: '',
    discount_percentage: 10,
    ends_at: defaultEndsAt(7),
    source: 'platform' as 'platform' | 'total',
  })
  const [showCouponForm, setShowCouponForm] = useState(false)

  const platformDiscounts = activeDiscounts.filter((d) => d.party === 'admin')

  const selectedInstructor = discountForm.instructor_id
    ? instructors.find((i) => i.id === discountForm.instructor_id)
    : undefined
  const instructorSelected = Boolean(selectedInstructor)
  const instructorCourses = discountForm.instructor_id
    ? publishedCourses.filter(
        (c) => c.instructor_id === discountForm.instructor_id
      )
    : []
  const courseSelected = Boolean(discountForm.course_id)
  const isFullOverride = discountForm.source === 'total'
  // The platform-only cap is the selected instructor's platform share.
  const platformCap = selectedInstructor?.adminPct ?? 0
  const effectiveMax = isFullOverride ? 100 : platformCap

  const setSource = (source: 'platform' | 'total') => {
    setDiscountForm((f) => ({
      ...f,
      source,
      discount_percentage:
        source === 'platform'
          ? Math.min(f.discount_percentage, platformCap)
          : f.discount_percentage,
    }))
  }

  const createDiscount = async () => {
    if (!discountForm.course_id) return
    setLoading(true)
    try {
      const res = await fetch('/api/discounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: discountForm.course_id,
          discount_percentage: discountForm.discount_percentage,
          ends_at: discountForm.ends_at,
          is_full_override: isFullOverride,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('already_active'))
        return
      }
      toast.success(t('publish'))
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const endDiscount = async (id: string) => {
    await fetch(`/api/discounts/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const deactivateCoupon = async (id: string) => {
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const exportLogsCsv = () => {
    const header = [
      'date',
      'course',
      'user',
      'original',
      'total_discount',
      'final',
      'coupon',
    ]
    const rows = logs.map((log) => {
      const course = log.course as { title?: string } | null
      const user = log.user as { full_name?: string } | null
      const coupon = log.coupon as { code?: string } | null
      return [
        log.created_at,
        course?.title ?? '',
        user?.full_name ?? '',
        log.original_price,
        log.total_discount_pct,
        log.final_price,
        coupon?.code ?? '',
      ]
    })
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'discount-logs.csv'
    a.click()
  }

  return (
    <Tabs defaultValue="discounts">
      <TabsList>
        <TabsTrigger value="discounts">{t('title')}</TabsTrigger>
        <TabsTrigger value="coupons">{tCoupons('title')}</TabsTrigger>
        <TabsTrigger value="logs">{t('history')}</TabsTrigger>
        <TabsTrigger value="commissions">
          {t('instructor_commissions_tab')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="discounts" className="space-y-8 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('create_discount_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('col_instructor')}</Label>
              <Select
                value={discountForm.instructor_id}
                onValueChange={(v) => {
                  if (!v) return
                  setDiscountForm((f) => ({
                    ...f,
                    instructor_id: v,
                    course_id: '',
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_instructor')} />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {isAr ? i.nameAr : i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instructorSelected && (
                <div className="rounded-md bg-muted/60 px-3 py-2">
                  <SplitBar
                    platform={selectedInstructor?.adminPct ?? 0}
                    instructor={selectedInstructor?.instructorPct ?? 0}
                    platformLabel={t('col_platform')}
                    instructorLabel={t('col_instructor')}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('col_course')}</Label>
              <Select
                value={discountForm.course_id}
                disabled={!instructorSelected}
                onValueChange={(v) => {
                  if (!v) return
                  setDiscountForm((f) => ({
                    ...f,
                    course_id: v,
                    discount_percentage:
                      f.source === 'platform'
                        ? Math.min(f.discount_percentage, platformCap)
                        : f.discount_percentage,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_course')} />
                </SelectTrigger>
                <SelectContent>
                  {instructorCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {isAr ? c.title_ar : c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!instructorSelected ? (
                <p className="text-xs text-muted-foreground">
                  {t('select_instructor_first')}
                </p>
              ) : instructorCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('no_courses_for_instructor')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('discount_source')}</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      key: 'platform' as const,
                      title: t('source_platform'),
                      hint: t('source_platform_hint', { pct: platformCap }),
                    },
                    {
                      key: 'total' as const,
                      title: t('source_total'),
                      hint: t('source_total_hint'),
                    },
                  ]
                ).map((option) => {
                  const active = discountForm.source === option.key
                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={!courseSelected}
                      onClick={() => setSource(option.key)}
                      className={cn(
                        'rounded-lg border p-3 text-start transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        active
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className={cn(
                            'inline-block size-3.5 rounded-full border-2',
                            active ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                          )}
                        />
                        {option.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <DiscountPercentSlider
              label={`${t('percentage')} (max ${effectiveMax}%)`}
              value={discountForm.discount_percentage}
              max={Math.max(effectiveMax, 1)}
              onChange={(v) =>
                setDiscountForm((f) => ({ ...f, discount_percentage: v }))
              }
              disabled={loading || !courseSelected}
            />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('ends_at')}</Label>
              <Input
                type="datetime-local"
                value={discountForm.ends_at.slice(0, 16)}
                disabled={!courseSelected}
                onChange={(e) =>
                  setDiscountForm((f) => ({
                    ...f,
                    ends_at: new Date(e.target.value).toISOString(),
                  }))
                }
              />
            </div>
            <Button
              disabled={loading || !courseSelected}
              onClick={() => void createDiscount()}
            >
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('publish')}
            </Button>
          </CardContent>
        </Card>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('col_course')}</TableHead>
              <TableHead>{t('col_platform')}</TableHead>
              <TableHead>{t('col_instructor')}</TableHead>
              <TableHead>{tOffers('total_discount')}</TableHead>
              <TableHead>{t('ends_at')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {platformDiscounts.map((d) => {
              const row = overview.find((o) => o.course_id === d.course_id)
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {isAr ? d.course?.title_ar : d.course?.title}
                      {d.is_full_override && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t('full_discount_badge')}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{d.discount_percentage}%</TableCell>
                  <TableCell>{row?.instructor_pct ?? 0}%</TableCell>
                  <TableCell>{row?.pricing?.total_discount_pct ?? d.discount_percentage}%</TableCell>
                  <TableCell>{new Date(d.ends_at).toLocaleDateString(locale)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => void endDiscount(d.id)}>
                      {t('end_discount')}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <div>
          <h3 className="font-semibold mb-3">{t('all_active_discounts')}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('col_course')}</TableHead>
                <TableHead>{t('col_admin')}</TableHead>
                <TableHead>{t('col_instructor')}</TableHead>
                <TableHead>{tOffers('original_price')}</TableHead>
                <TableHead>{tOffers('final_price')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.map((row) => (
                <TableRow key={row.course_id}>
                  <TableCell>
                    {isAr ? row.course?.title_ar : row.course?.title}
                  </TableCell>
                  <TableCell>{row.admin_pct}%</TableCell>
                  <TableCell>{row.instructor_pct}%</TableCell>
                  <TableCell>{formatPrice(row.pricing?.original_price ?? 0)}</TableCell>
                  <TableCell>{formatPrice(row.pricing?.final_price ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="coupons" className="space-y-4 mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{tCoupons('admin_coupons_hint')}</p>
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
            allowPlatformScope
            codePrefix="EDU"
            courses={publishedCourses.map((c) => ({
              id: c.id,
              title: c.title,
              title_ar: c.title_ar,
              price: c.price,
            }))}
            onCreated={() => {
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
              <TableHead>{tCoupons('scope_label')}</TableHead>
              <TableHead>%</TableHead>
              <TableHead>{tCoupons('current_uses')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id as string}>
                <TableCell className="font-mono">{c.code as string}</TableCell>
                <TableCell>
                  {c.scope === 'platform'
                    ? tCoupons('scope_platform')
                    : isAr
                      ? (c.course as { title_ar?: string } | undefined)?.title_ar
                      : (c.course as { title?: string } | undefined)?.title}
                </TableCell>
                <TableCell>{c.discount_percentage as number}%</TableCell>
                <TableCell>
                  {c.current_uses as number} / {(c.max_uses as number | null) ?? '—'}
                </TableCell>
                <TableCell>
                  {Boolean(c.is_active) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deactivateCoupon(c.id as string)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="logs" className="mt-6 space-y-4">
        <Button variant="outline" onClick={exportLogsCsv}>
          Export CSV
        </Button>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>User</TableHead>
              <TableHead>{tOffers('original_price')}</TableHead>
              <TableHead>{tOffers('total_discount')}</TableHead>
              <TableHead>{tOffers('final_price')}</TableHead>
              <TableHead>{tCoupons('code')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const course = log.course as { title?: string; title_ar?: string } | null
              const user = log.user as { full_name?: string } | null
              const coupon = log.coupon as { code?: string } | null
              return (
                <TableRow key={log.id as string}>
                  <TableCell>
                    {new Date(log.created_at as string).toLocaleString(locale)}
                  </TableCell>
                  <TableCell>{isAr ? course?.title_ar : course?.title}</TableCell>
                  <TableCell>{user?.full_name}</TableCell>
                  <TableCell>{formatPrice(Number(log.original_price))}</TableCell>
                  <TableCell>{log.total_discount_pct as number}%</TableCell>
                  <TableCell>{formatPrice(Number(log.final_price))}</TableCell>
                  <TableCell>{coupon?.code ?? '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="commissions" className="mt-6">
        <AdminInstructorCommissions
          locale={locale}
          instructors={instructors}
          defaultInstructorPct={defaultInstructorPct}
        />
      </TabsContent>
    </Tabs>
  )
}
