'use server'

import { revalidatePath } from 'next/cache'
import { revalidateCoursesListingCache } from '@/lib/cache/invalidate-listing-cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEnrollmentNotifications } from '@/lib/courses/send-enrollment-notifications'
import {
  buildDiscountSnapshot,
  logDiscountPurchase,
  redeemCoupon,
  resolveCourseCheckout,
} from '@/lib/discounts'
import { requireCourseRevenueAgreement } from '@/lib/revenue/require-agreement'
import { applyFinancialSnapshot } from '@/lib/revenue/apply-snapshot'
import type { PriceCalculation } from '@/types'

export interface EnrollResult {
  success: boolean
  error?: string
}

async function createVirtualEnrollment(
  userId: string,
  courseId: string,
  instructorId: string,
  pricing: PriceCalculation,
  couponId?: string | null
): Promise<{ ok: true; paymentId: string } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const referenceId = `virtual-${userId.slice(0, 8)}-${courseId.slice(0, 8)}-${Date.now()}`

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      user_id: userId,
      course_id: courseId,
      amount: pricing.final_price,
      coupon_id: couponId ?? null,
      discount_snapshot: buildDiscountSnapshot(pricing),
      currency: 'IQD',
      method: 'virtual',
      status: 'completed',
      reference_id: referenceId,
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    return { ok: false, error: paymentError?.message ?? 'payment_failed' }
  }

  try {
    if (couponId && pricing.coupon_discount_pct > 0) {
      await redeemCoupon(couponId, userId, courseId, payment.id, pricing)
    } else {
      await logDiscountPurchase(pricing, courseId, userId, payment.id, couponId)
    }
  } catch {
    await admin.from('payments').delete().eq('id', payment.id)
    return { ok: false, error: 'coupon_redeem_failed' }
  }

  const { error: enrollError } = await admin.from('enrollments').insert({
    student_id: userId,
    course_id: courseId,
    payment_id: payment.id,
  })

  if (enrollError) {
    return { ok: false, error: enrollError.message }
  }

  if (pricing.final_price > 0) {
    const snapshot = await applyFinancialSnapshot({
      paymentId: payment.id,
      instructorId,
      grossAmount: pricing.final_price,
      method: 'virtual',
    })
    if (!snapshot.ok) {
      await admin.from('enrollments').delete().eq('payment_id', payment.id)
      await admin.from('payments').delete().eq('id', payment.id)
      return { ok: false, error: snapshot.error }
    }
  }

  return { ok: true, paymentId: payment.id }
}

export async function enrollInCourse(
  courseId: string,
  locale: string,
  couponCode?: string
): Promise<EnrollResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'not_authenticated' }
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, price, status, instructor_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return { success: false, error: 'course_not_found' }
  }

  if (course.status !== 'published') {
    return { success: false, error: 'course_not_available' }
  }

  if (course.instructor_id === user.id) {
    return { success: false, error: 'own_course' }
  }

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing) {
    return { success: true }
  }

  if (course.price > 0) {
    // Paid courses must go through the payment gateway (Wayl). The free
    // "virtual" enrollment is a beta-only path, hard-blocked in production even
    // if the flag is accidentally set (mirrors the PAYMENT_DEV_MODE guard).
    const allowFreePaid =
      process.env.ALLOW_FREE_PAID_ENROLLMENT === 'true' &&
      process.env.NODE_ENV !== 'production'
    if (!allowFreePaid) {
      return { success: false, error: 'payment_required' }
    }

    const agreementCheck = await requireCourseRevenueAgreement(courseId)
    if (!agreementCheck.ok) {
      return { success: false, error: agreementCheck.error }
    }

    const checkout = await resolveCourseCheckout(courseId, user.id, couponCode)
    if (!checkout.ok) {
      return { success: false, error: checkout.error }
    }

    const virtual = await createVirtualEnrollment(
      user.id,
      courseId,
      agreementCheck.instructorId,
      checkout.pricing,
      checkout.couponId
    )
    if (!virtual.ok) {
      return { success: false, error: virtual.error }
    }
  } else {
    // Free course: enrollments are service-role-only (RLS blocks direct inserts).
    const { error: enrollError } = await createAdminClient().from('enrollments').insert({
      student_id: user.id,
      course_id: courseId,
    })

    if (enrollError) {
      return { success: false, error: enrollError.message }
    }
  }

  const userIdForNotify = user.id
  after(() => sendEnrollmentNotifications(courseId, userIdForNotify, locale))

  revalidateCoursesListingCache()
  revalidatePath(`/${locale}/courses/${courseId}`)
  revalidatePath(`/${locale}/dashboard/my-courses`)
  revalidatePath(`/${locale}/dashboard/my-learning`)
  revalidatePath(`/${locale}/instructor`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio`)

  return { success: true }
}
