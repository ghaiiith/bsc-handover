'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Award,
  BookOpen,
  Clock,
  Globe,
  GraduationCap,
  Link2,
  Loader2,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatPrice } from '@/lib/utils'
import { enrollInCourse } from '@/lib/courses/actions'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import CoursePreviewPlayer from '@/components/courses/CoursePreviewPlayer'
import CourseWishlistButton from '@/components/courses/CourseWishlistButton'
import CourseCouponField from '@/components/courses/CourseCouponField'
import PaymentMethodModal from '@/components/payment/PaymentMethodModal'
import DiscountCountdown from '@/components/discounts/DiscountCountdown'
import { getLevelLabel, levelStyles } from '@/components/courses/level-styles'
import { formatDurationMinutes } from '@/lib/courses/format-duration'
import type { Course, CourseDiscount, CourseLevel, PriceCalculation } from '@/types'

interface CourseEnrollSidebarProps {
  locale: string
  course: Course
  isEnrolled: boolean
  isInstructor: boolean
  isLoggedIn: boolean
  firstLessonSlug?: string
  hasPreviewVideo?: boolean
  initialWishlisted?: boolean
  pricing: PriceCalculation
  activeDiscounts?: {
    admin: CourseDiscount | null
    instructor: CourseDiscount | null
  }
  /** When set, overrides `course.total_duration_minutes` for display (curriculum sum). */
  durationMinutes?: number
  /** When set, overrides `course.total_lessons` for display (curriculum count). */
  lessonCount?: number
}

export default function CourseEnrollSidebar({
  locale,
  course,
  isEnrolled,
  isInstructor,
  isLoggedIn,
  firstLessonSlug,
  hasPreviewVideo = false,
  initialWishlisted = false,
  pricing: initialPricing,
  activeDiscounts,
  durationMinutes,
  lessonCount,
}: CourseEnrollSidebarProps) {
  const t = useTranslations('courses')
  const tOffers = useTranslations('offers')
  const tPayment = useTranslations('payment')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [pricing, setPricing] = useState<PriceCalculation>(initialPricing)
  const [showPayment, setShowPayment] = useState(false)

  const displayPricing = couponCode ? pricing : initialPricing
  const isAr = locale === 'ar'
  const displayLessonCount = lessonCount ?? course.total_lessons
  const displayDurationMinutes = durationMinutes ?? course.total_duration_minutes
  const levelLabel = getLevelLabel(course.level, t)
  const durationLabels = {
    minutes: t('minutes'),
    hours: t('hours'),
    hour: t('hour'),
  }
  const languageLabel =
    course.language === 'ar' ? t('language_ar') : t('language_en')
  const courseTitle = isAr ? course.title_ar : course.title
  const hasSale =
    displayPricing.total_discount_pct > 0 && displayPricing.original_price > 0

  const nearestEndsAt = useMemo(() => {
    const ends = [
      activeDiscounts?.admin?.ends_at,
      activeDiscounts?.instructor?.ends_at,
    ].filter(Boolean) as string[]
    if (!ends.length) return null
    return ends.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
  }, [activeDiscounts])

  const handleEnroll = () => {
    // Paid courses go through the payment gateway (Wayl); only free courses
    // enroll instantly.
    if (course.price > 0) {
      setShowPayment(true)
      return
    }

    startTransition(async () => {
      const result = await enrollInCourse(course.id, locale, couponCode ?? undefined)

      if (result.success) {
        toast.success(tPayment('free_enrolled'))
        router.refresh()
        return
      }

      if (result.error === 'not_authenticated') {
        router.push(`/${locale}/login`)
        return
      }

      if (result.error?.startsWith('coupon_')) {
        const key = result.error.replace('coupon_', '')
        toast.error(t(`coupon_error_coupon_${key}` as 'coupon_error_coupon_invalid'))
        return
      }

      toast.error(t('enroll_error'))
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success(t('link_copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('enroll_error'))
    }
  }

  const renderActionButton = (compact = false) => {
    const btnClass = compact ? undefined : 'w-full'

    if (isInstructor) {
      return (
        <Link
          href={`/${locale}/instructor/courses/${course.id}/edit`}
          className={cn(buttonVariants({ size: 'lg' }), btnClass)}
        >
          {t('edit_course')}
        </Link>
      )
    }

    if (isEnrolled) {
      const href =
        firstLessonSlug && course.slug
          ? buildLearnLessonPath(locale, course.slug, firstLessonSlug)
          : `/${locale}/dashboard/my-learning`

      return (
        <Link
          href={href}
          className={cn(buttonVariants({ size: 'lg' }), btnClass)}
        >
          {t('go_to_course')}
        </Link>
      )
    }

    if (!isLoggedIn) {
      return (
        <Link
          href={`/${locale}/login`}
          className={cn(buttonVariants({ size: 'lg' }), btnClass)}
        >
          {t('enroll_now')}
        </Link>
      )
    }

    return (
      <Button
        size="lg"
        className={btnClass}
        onClick={handleEnroll}
        disabled={isPending}
      >
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t('enroll_now')}
      </Button>
    )
  }

  return (
    <>
    <Card className="overflow-hidden rounded-xl border shadow-md lg:sticky lg:top-20">
      {/* Report BS-98: the large preview lives at the top of the main column on
          desktop; below lg this stays the only player, so mobile keeps it in
          the natural reading order. */}
      {hasPreviewVideo ? (
        <CoursePreviewPlayer
          courseId={course.id}
          poster={course.thumbnail_url}
          title={courseTitle}
          className="lg:hidden"
        />
      ) : course.thumbnail_url ? (
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={course.thumbnail_url}
            alt={courseTitle}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 360px"
            priority
          />
        </div>
      ) : null}

      <CardContent className="space-y-5 p-5">
        <div>
          {course.price === 0 ? (
            <Badge className="text-base px-3 py-1 bg-emerald-600 hover:bg-emerald-600">
              {t('free')}
            </Badge>
          ) : (
            <div className="space-y-2">
              {hasSale && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatPrice(displayPricing.original_price)}
                </p>
              )}
              <p className="text-3xl font-bold text-orange-600">
                {formatPrice(displayPricing.final_price)}
              </p>
              {hasSale && (
                <div className="space-y-1">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                    <Tag className="h-3 w-3" />
                    {Math.round(displayPricing.total_discount_pct)}% {tOffers('savings')}
                  </Badge>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {displayPricing.instructor_discount_pct > 0 && (
                      <p>
                        {t('instructor_discount')}: {displayPricing.instructor_discount_pct}%
                      </p>
                    )}
                    {displayPricing.admin_discount_pct > 0 && (
                      <p>
                        {t('platform_discount')}: {displayPricing.admin_discount_pct}%
                      </p>
                    )}
                    {displayPricing.coupon_discount_pct > 0 && (
                      <p>
                        {t('coupon_discount')}: {displayPricing.coupon_discount_pct}%
                      </p>
                    )}
                  </div>
                </div>
              )}
              {nearestEndsAt && <DiscountCountdown endsAt={nearestEndsAt} />}
            </div>
          )}
        </div>

        {!isInstructor && isLoggedIn && !isEnrolled && course.price > 0 && (
          <CourseCouponField
            courseId={course.id}
            disabled={isPending}
            onApplied={(code, nextPricing) => {
              setCouponCode(code)
              setPricing(nextPricing)
            }}
            onClear={() => {
              setCouponCode(null)
              setPricing(initialPricing)
            }}
          />
        )}

        {renderActionButton()}

        {!isInstructor && isLoggedIn && !isEnrolled && course.price === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {t('virtual_enroll_note')}
          </p>
        )}

        {!isInstructor && isLoggedIn && (
          <CourseWishlistButton
            courseId={course.id}
            locale={locale}
            initialWishlisted={initialWishlisted}
            className="w-full"
          />
        )}

        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {displayLessonCount} {t('lessons')}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {formatDurationMinutes(displayDurationMinutes, durationLabels)}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
            <Badge className={levelStyles[course.level as CourseLevel]} variant="secondary">
              {levelLabel}
            </Badge>
          </li>
          <li className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{languageLabel}</span>
          </li>
          <li className="flex items-center gap-3">
            <Award className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {t('certificate')} — {t('certificate_available')}
            </span>
          </li>
        </ul>

        <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
          <Link2 className="h-4 w-4" />
          {copied ? t('link_copied') : t('share')}
        </Button>
      </CardContent>
    </Card>

    <div className="mobile-sticky-cta lg:hidden">
      <div className="container mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          {hasSale ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary num-en">
                {formatPrice(displayPricing.final_price)}
              </span>
              <span className="text-sm text-muted-foreground line-through num-en">
                {formatPrice(displayPricing.original_price)}
              </span>
            </div>
          ) : (
            <p className="text-lg font-bold num-en">
              {displayPricing.final_price <= 0
                ? t('free')
                : formatPrice(displayPricing.final_price)}
            </p>
          )}
        </div>
        <div className="shrink-0 [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap">
          {renderActionButton(true)}
        </div>
      </div>
    </div>

    {!isInstructor && isLoggedIn && !isEnrolled && course.price > 0 && (
      <PaymentMethodModal
        open={showPayment}
        onOpenChange={setShowPayment}
        type="course"
        courseId={course.id}
        courseTitle={course.title}
        price={displayPricing.final_price}
        locale={locale}
        couponCode={couponCode ?? undefined}
        onSuccess={() => router.refresh()}
      />
    )}
    </>
  )
}
