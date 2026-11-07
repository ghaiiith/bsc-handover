import { sendMetaConversion } from '@/lib/tracking/meta-capi'
import { revalidatePath } from 'next/cache'
import { revalidateCoursesListingCache } from '@/lib/cache/invalidate-listing-cache'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'
import { sendEnrollmentNotifications } from '@/lib/courses/send-enrollment-notifications'
import {
  logDiscountPurchase,
  priceFromSnapshot,
  redeemCoupon,
} from '@/lib/discounts'
import {
  applyFinancialSnapshot,
  resolveDiscountContext,
  resolvePaymentInstructorId,
  resolveCoursePlatformOverride,
} from '@/lib/revenue/apply-snapshot'
import { sendServiceOrderPlacedNotifications } from '@/lib/services/send-order-notifications'

export interface CompletePaymentResult {
  success: boolean
  type: 'course' | 'service' | 'subscription' | 'academy'
  courseId?: string
  orderId?: string
  userId?: string
  locale?: string
  error?: string
  alreadyCompleted?: boolean
}

export async function completePayment(
  referenceId: string,
  gatewayTransactionId?: string,
  locale = 'ar'
): Promise<CompletePaymentResult> {
  const admin = createAdminClient()

  const { data: payment, error: findError } = await admin
    .from('payments')
    .select('id, user_id, course_id, service_order_id, employer_subscription_id, academy_purchase_id, status, coupon_id, discount_snapshot, amount, method, financial_snapshot_at')
    .eq('reference_id', referenceId)
    .single()

  if (findError || !payment) {
    console.error('[payment] Payment not found:', referenceId, findError)
    return { success: false, type: 'course', error: 'payment_not_found' }
  }

  const isService = Boolean(payment.service_order_id)

  if (payment.status === 'completed') {
    return {
      success: true,
      type: isService ? 'service' : 'course',
      courseId: payment.course_id ?? undefined,
      orderId: payment.service_order_id ?? undefined,
      userId: payment.user_id ?? undefined,
      locale,
      alreadyCompleted: true,
    }
  }

  // Atomic pending → completed transition. The conditional `status = 'pending'`
  // guard means only ONE of two concurrent webhook deliveries wins the update;
  // the loser sees zero rows and returns early, so the snapshot/enrollment side
  // effects below run at most once.
  const { data: transitioned, error: updateError } = await admin
    .from('payments')
    .update({
      status: 'completed',
      gateway_transaction_id: gatewayTransactionId ?? null,
    })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id')

  if (updateError) {
    console.error('[payment] Failed to update payment:', updateError)
    return { success: false, type: isService ? 'service' : 'course', error: 'update_failed' }
  }

  if (!transitioned || transitioned.length === 0) {
    // A concurrent delivery already completed it — treat as idempotent success.
    return {
      success: true,
      type: isService ? 'service' : 'course',
      courseId: payment.course_id ?? undefined,
      orderId: payment.service_order_id ?? undefined,
      userId: payment.user_id ?? undefined,
      locale,
      alreadyCompleted: true,
    }
  }

  // Marketing item 3: every completed payment is a server-side Purchase event.
  // Hashed email only; amount in IQD. Never blocks fulfilment.
  {
    const admin = createAdminClient()
    const { data: buyer } = await admin
      .from('users')
      .select('email')
      .eq('id', payment.user_id as string)
      .maybeSingle()
    void sendMetaConversion({
      event: 'Purchase',
      eventId: `pay_${payment.id}`,
      user: { email: (buyer?.email as string) ?? null, externalId: payment.user_id as string },
      value: Number(payment.amount ?? 0),
      currency: 'IQD',
      contentName: payment.course_id
        ? 'course'
        : payment.employer_subscription_id
          ? 'employer_subscription'
          : payment.academy_purchase_id
            ? 'academy_seats'
            : 'service',
    }).catch(() => {})
  }

  // Subscription payment (report BS-15): activate the employer's plan and stop.
  if (payment.employer_subscription_id) {
    const { activateSubscription } = await import('@/lib/jobs/employer-subscription')
    // BS-99: an actual payment stacks on any remaining days instead of
    // discarding them, and is audited with the amount that was charged.
    const res = await activateSubscription(payment.employer_subscription_id as string, {
      mode: 'paid',
      amount: Number(payment.amount ?? 0),
    })
    if (res.ok && res.userId) {
      await createNotification({
        userId: res.userId,
        title: 'Subscription activated',
        titleAr: 'تم تفعيل الاشتراك',
        body: 'Your employer plan is now active. You can post jobs up to your plan limit.',
        bodyAr: 'باقتك أصبحت فعّالة الآن. تقدر تنشر وظائف ضمن حد باقتك.',
        type: buildNotificationType(NotificationKind.commissionUpdated),
      })
    }
    revalidatePath(`/${locale}/dashboard/subscription`)
    revalidatePath(`/${locale}/payment/success`)
    return {
      success: res.ok,
      type: 'subscription',
      userId: payment.user_id ?? undefined,
      locale,
      error: res.ok ? undefined : 'activate_failed',
    }
  }

  if (!payment.financial_snapshot_at) {
    const instructorId = await resolvePaymentInstructorId(payment)
    if (instructorId) {
      // Report BS-48: attribute each party's discount to its own share.
      const discount = await resolveDiscountContext(
        (payment as { discount_snapshot?: Record<string, unknown> | null })
          .discount_snapshot ?? null
      )
      const snapshot = await applyFinancialSnapshot({
        paymentId: payment.id,
        instructorId,
        grossAmount: Number(payment.amount),
        method: payment.method as string,
        discount,
        // Report BS-78: honor a per-course platform-% override at payout.
        overridePlatformPct: await resolveCoursePlatformOverride({
          course_id: payment.course_id,
          academy_purchase_id: payment.academy_purchase_id,
        }),
      })
      if (!snapshot.ok) {
        console.error('[payment] Financial snapshot failed:', snapshot.error)
      }
    }
  }

  // Report BS-70: Company Academy bulk purchase — mark it paid and notify the
  // company + admins to provision the seats. The instructor was already credited
  // by the financial snapshot above (resolvePaymentInstructorId maps the academy
  // purchase to its course instructor).
  if (payment.academy_purchase_id) {
    await admin
      .from('academy_purchases')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payment.academy_purchase_id)

    const purchaseId = payment.academy_purchase_id as string
    after(async () => {
      const a = createAdminClient()
      const { data: p } = await a
        .from('academy_purchases')
        .select('company_id, seats, course_id')
        .eq('id', purchaseId)
        .single()
      if (!p) return
      const { notifyAllAdmins } = await import('@/lib/admin/notify-admins')
      await Promise.all([
        createNotification({
          userId: p.company_id as string,
          title: 'Academy purchase confirmed',
          titleAr: 'تم تأكيد شراء الأكاديمية',
          body: `Your purchase of ${p.seats} seats is confirmed. Our team will help you assign them.`,
          bodyAr: `تم تأكيد شراء ${p.seats} مقعد. فريقنا حيساعدك بتوزيعها.`,
          type: `academy_paid:${purchaseId}`,
        }),
        notifyAllAdmins({
          title: 'Academy purchase paid',
          titleAr: 'تم دفع شراء أكاديمية',
          body: `A company paid for ${p.seats} academy seats — provision the enrolments.`,
          bodyAr: `شركة دفعت مقابل ${p.seats} مقعد أكاديمية — جهّز التسجيلات.`,
          type: `academy_paid_admin:${purchaseId}`,
        }),
      ])
    })

    revalidatePath(`/${locale}/dashboard/academy`)
    revalidatePath(`/${locale}/payment/success`)
    return {
      success: true,
      type: 'academy',
      userId: payment.user_id ?? undefined,
      locale,
    }
  }

  if (isService && payment.service_order_id) {
    await admin
      .from('service_orders')
      .update({ payment_id: payment.id })
      .eq('id', payment.service_order_id)

    const orderId = payment.service_order_id
    const userIdForNotify = payment.user_id
    const localeForNotify = locale
    after(async () => {
      const notifyAdmin = createAdminClient()
      const { data: order } = await notifyAdmin
        .from('service_orders')
        .select('service_id, requirements')
        .eq('id', orderId)
        .single()

      if (!order?.service_id || !userIdForNotify) return

      await sendServiceOrderPlacedNotifications(
        orderId,
        order.service_id as string,
        userIdForNotify,
        (order.requirements as string | null) ?? '',
        localeForNotify
      )
    })

    revalidatePath(`/${locale}/dashboard/orders/incoming`)
    revalidatePath(`/${locale}/dashboard/orders/my-orders`)
    revalidatePath(`/${locale}/dashboard/orders/${payment.service_order_id}`)
    revalidatePath(`/${locale}/payment/success`)

    return {
      success: true,
      type: 'service',
      orderId: payment.service_order_id,
      userId: payment.user_id ?? undefined,
      locale,
    }
  }

  if (!payment.user_id || !payment.course_id) {
    return { success: false, type: 'course', error: 'invalid_payment' }
  }

  const { data: existingEnrollment } = await admin
    .from('enrollments')
    .select('id')
    .eq('student_id', payment.user_id)
    .eq('course_id', payment.course_id)
    .maybeSingle()

  if (!existingEnrollment) {
    const { error: enrollError } = await admin.from('enrollments').insert({
      student_id: payment.user_id,
      course_id: payment.course_id,
      payment_id: payment.id,
    })

    if (enrollError) {
      console.error('[payment] Failed to create enrollment:', enrollError)
      return { success: false, type: 'course', error: 'enrollment_failed' }
    }

    const snapshot = payment.discount_snapshot as Record<string, unknown> | null
    const pricing = snapshot
      ? priceFromSnapshot(snapshot)
      : {
          original_price: 0,
          admin_discount_pct: 0,
          instructor_discount_pct: 0,
          coupon_discount_pct: 0,
          total_discount_pct: 0,
          final_price: 0,
          savings: 0,
        }

    try {
      if (
        payment.coupon_id &&
        payment.user_id &&
        payment.course_id &&
        pricing.coupon_discount_pct > 0
      ) {
        await redeemCoupon(
          payment.coupon_id,
          payment.user_id,
          payment.course_id,
          payment.id,
          pricing
        )
      } else if (payment.user_id && payment.course_id) {
        await logDiscountPurchase(
          pricing,
          payment.course_id,
          payment.user_id,
          payment.id,
          payment.coupon_id
        )
      }
    } catch (err) {
      console.error('[payment] Discount log/redemption failed:', err)
    }

    const courseIdForNotify = payment.course_id
    const userIdForNotify = payment.user_id
    after(() =>
      sendEnrollmentNotifications(courseIdForNotify, userIdForNotify, locale)
    )
  }

  revalidateCoursesListingCache()
  revalidatePath(`/${locale}/courses/${payment.course_id}`)
  revalidatePath(`/${locale}/dashboard/my-courses`)
  revalidatePath(`/${locale}/payment/success`)

  return {
    success: true,
    type: 'course',
    courseId: payment.course_id,
    userId: payment.user_id,
    locale,
  }
}

export async function failPayment(
  referenceId: string,
  _locale = 'ar'
): Promise<{ courseId?: string; orderId?: string }> {
  const admin = createAdminClient()

  const { data: payment } = await admin
    .from('payments')
    .select('id, user_id, course_id, service_order_id, status')
    .eq('reference_id', referenceId)
    .single()

  if (!payment || payment.status === 'completed') {
    return {
      courseId: payment?.course_id ?? undefined,
      orderId: payment?.service_order_id ?? undefined,
    }
  }

  await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)

  if (payment.service_order_id) {
    await admin
      .from('service_orders')
      .update({ status: 'cancelled' })
      .eq('id', payment.service_order_id)

    if (payment.user_id) {
      await createNotification({
        userId: payment.user_id,
        title: 'Payment failed',
        titleAr: 'فشل الدفع',
        body: 'Your payment could not be completed. The order was cancelled.',
        bodyAr: 'تعذر إتمام الدفع. تم إلغاء الطلب.',
        type: buildNotificationType(
          NotificationKind.serviceOrderCancelled,
          payment.service_order_id
        ),
      })
    }
  }

  return {
    courseId: payment.course_id ?? undefined,
    orderId: payment.service_order_id ?? undefined,
  }
}
