import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEnrollmentNotifications } from '@/lib/courses/send-enrollment-notifications'
import { initiateZainCashPayment } from '@/lib/payment/gateways/zaincash'
import { initiateQiCardPayment } from '@/lib/payment/gateways/qicard'
import { initiateWaylPayment } from '@/lib/payment/gateways/wayl'
import {
  isGatewayConfigured,
  isPaymentDevMode,
  canSkipServicePayment,
  getWaylMinAmount,
} from '@/lib/payment/config'
import { checkPaymentRateLimit } from '@/lib/payment/rate-limit'
import { requireCourseRevenueAgreement } from '@/lib/revenue/require-agreement'
import { normalizeMoneyAmount } from '@/lib/format-number'
import { completePayment } from '@/lib/payment/complete-payment'
import {
  buildDiscountSnapshot,
  resolveCourseCheckout,
} from '@/lib/discounts'
import { computeSeatPricing } from '@/lib/company/academy-pricing'
import { getAcademySeatTiers } from '@/lib/company/academy-tiers'
import type { PriceCalculation } from '@/types'
import type { PaymentMethod } from '@/types'

const courseSchema = z.object({
  type: z.literal('course').optional().default('course'),
  courseId: z.string().uuid(),
  method: z.enum(['zaincash', 'qicard', 'wayl']),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
  couponCode: z.string().optional(),
})

const serviceSchema = z.object({
  type: z.literal('service'),
  serviceId: z.string().uuid(),
  requirements: z.string().min(20).max(2000),
  method: z.enum(['zaincash', 'qicard', 'wayl']),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
})

const serviceSkipSchema = z.object({
  type: z.literal('service'),
  serviceId: z.string().uuid(),
  requirements: z.string().min(20).max(2000),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
  skipPayment: z.literal(true),
})

const subscriptionSchema = z.object({
  type: z.literal('subscription'),
  planId: z.string().uuid(),
  method: z.enum(['zaincash', 'qicard', 'wayl']),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
})

// Report BS-70: Company Academy bulk seat checkout.
const academySchema = z.object({
  type: z.literal('academy'),
  courseId: z.string().uuid(),
  seats: z.number().int().min(1).max(100000),
  method: z.enum(['zaincash', 'qicard', 'wayl']),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
})

const initiateSchema = z.union([
  courseSchema,
  serviceSchema,
  serviceSkipSchema,
  subscriptionSchema,
  academySchema,
])

async function handleCoursePayment(
  userId: string,
  courseId: string,
  method: PaymentMethod,
  locale: string,
  couponCode?: string
) {
  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, price, status, instructor_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Course not found', code: 'course_not_found' },
      { status: 404 }
    )
  }

  if (course.status !== 'published') {
    return NextResponse.json(
      { error: 'Course not available', code: 'course_not_available' },
      { status: 400 }
    )
  }

  if (course.instructor_id === userId) {
    return NextResponse.json(
      { error: 'Cannot enroll in own course', code: 'own_course' },
      { status: 400 }
    )
  }

  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existingEnrollment) {
    return NextResponse.json(
      { error: 'already_enrolled', code: 'already_enrolled' },
      { status: 400 }
    )
  }

  if (normalizeMoneyAmount(course.price) === 0) {
    // Enrollments are service-role-only (RLS blocks direct inserts). This path
    // is reached only after the free-course price check above.
    const { error: enrollError } = await createAdminClient().from('enrollments').insert({
      student_id: userId,
      course_id: courseId,
    })

    if (enrollError) {
      // Concurrent double-submit: the UNIQUE(student_id, course_id) constraint
      // rejected the second insert. Treat as success rather than a 500.
      if (enrollError.code === '23505') {
        return NextResponse.json(
          { error: 'already_enrolled', code: 'already_enrolled' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Enrollment failed', code: 'enrollment_failed' },
        { status: 500 }
      )
    }

    after(() => sendEnrollmentNotifications(courseId, userId, locale))

    return NextResponse.json({ enrolled: true })
  }

  const checkout = await resolveCourseCheckout(courseId, userId, couponCode)
  if (!checkout.ok) {
    return NextResponse.json(
      { error: checkout.error, code: checkout.error },
      { status: 400 }
    )
  }

  const agreementCheck = await requireCourseRevenueAgreement(courseId)
  if (!agreementCheck.ok) {
    return NextResponse.json(
      { error: 'no_revenue_agreement', code: 'no_revenue_agreement' },
      { status: 400 }
    )
  }

  const { pricing, couponId } = checkout

  return processPayment({
    userId,
    amount: pricing.final_price,
    method,
    locale,
    courseId,
    redirectProductId: courseId,
    paymentType: 'course',
    coursePricing: pricing,
    couponId,
  })
}

async function handleServicePayment(
  userId: string,
  serviceId: string,
  requirements: string,
  method: PaymentMethod,
  locale: string
) {
  const supabase = await createClient()

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, price, status, seller_id')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    return NextResponse.json(
      { error: 'Service not found', code: 'service_not_found' },
      { status: 404 }
    )
  }

  if (service.status !== 'active') {
    return NextResponse.json(
      { error: 'Service not available', code: 'service_not_available' },
      { status: 400 }
    )
  }

  if (service.seller_id === userId) {
    return NextResponse.json(
      { error: 'Cannot order own service', code: 'own_service' },
      { status: 400 }
    )
  }

  // Report BS-55: only a PAID order (or a very recent unpaid attempt) blocks a
  // re-order. Previously an abandoned checkout left a 'pending' row forever and
  // the buyer could never purchase that service again.
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: activeOrder } = await supabase
    .from('service_orders')
    .select('id, payment_id, ordered_at')
    .eq('service_id', serviceId)
    .eq('buyer_id', userId)
    .in('status', ['pending', 'in_progress', 'delivered'])
    .or(`payment_id.not.is.null,ordered_at.gt.${staleCutoff}`)
    .maybeSingle()

  if (activeOrder) {
    return NextResponse.json(
      { error: 'active_order_exists', code: 'active_order_exists' },
      { status: 400 }
    )
  }

  return processPayment({
    userId,
    amount: normalizeMoneyAmount(service.price),
    method,
    locale,
    serviceId,
    requirements,
    sellerId: service.seller_id as string,
    redirectProductId: serviceId,
    paymentType: 'service',
  })
}

async function handleServicePaymentSkip(
  userId: string,
  serviceId: string,
  requirements: string,
  locale: string
) {
  if (!canSkipServicePayment()) {
    return NextResponse.json(
      { error: 'Payment skip is not allowed', code: 'skip_not_allowed' },
      { status: 403 }
    )
  }

  const supabase = await createClient()

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, price, status, seller_id')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    return NextResponse.json(
      { error: 'Service not found', code: 'service_not_found' },
      { status: 404 }
    )
  }

  if (service.status !== 'active') {
    return NextResponse.json(
      { error: 'Service not available', code: 'service_not_available' },
      { status: 400 }
    )
  }

  if (service.seller_id === userId) {
    return NextResponse.json(
      { error: 'Cannot order own service', code: 'own_service' },
      { status: 400 }
    )
  }

  const { data: activeOrder } = await supabase
    .from('service_orders')
    .select('id')
    .eq('service_id', serviceId)
    .eq('buyer_id', userId)
    .in('status', ['pending', 'in_progress', 'delivered'])
    .maybeSingle()

  if (activeOrder) {
    return NextResponse.json(
      { error: 'active_order_exists', code: 'active_order_exists' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const referenceId = crypto.randomUUID()
  const amount = normalizeMoneyAmount(service.price)

  const { data: order, error: orderError } = await admin
    .from('service_orders')
    .insert({
      service_id: serviceId,
      buyer_id: userId,
      seller_id: service.seller_id as string,
      requirements,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[payment/initiate] Service order failed (skip):', orderError)
    return NextResponse.json(
      { error: 'Failed to create order', code: 'order_create_failed' },
      { status: 500 }
    )
  }

  const serviceOrderId = order.id as string

  const { error: paymentError } = await admin.from('payments').insert({
    user_id: userId,
    service_order_id: serviceOrderId,
    amount,
    currency: 'IQD',
    method: 'zaincash',
    status: 'pending',
    reference_id: referenceId,
  })

  if (paymentError) {
    console.error('[payment/initiate] Failed to create payment (skip):', paymentError)
    await admin.from('service_orders').delete().eq('id', serviceOrderId)
    return NextResponse.json(
      { error: 'Failed to create payment', code: 'payment_create_failed' },
      { status: 500 }
    )
  }

  const completed = await completePayment(referenceId, 'SKIP-PAYMENT', locale)

  if (!completed.success) {
    console.error('[payment/initiate] Skip completion failed:', completed.error)
    await admin.from('payments').delete().eq('reference_id', referenceId)
    await admin.from('service_orders').delete().eq('id', serviceOrderId)
    return NextResponse.json(
      { error: 'Failed to complete order', code: 'skip_complete_failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    skipped: true,
    orderId: serviceOrderId,
  })
}

async function handleSubscriptionPayment(
  userId: string,
  planId: string,
  method: PaymentMethod,
  locale: string
) {
  const supabase = await createClient()

  // Only companies subscribe to employer plans.
  const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single()
  if (profile?.role !== 'company') {
    return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: plan } = await admin
    .from('employer_plans')
    .select('id, price, is_active')
    .eq('id', planId)
    .maybeSingle()

  if (!plan || plan.is_active === false) {
    return NextResponse.json({ error: 'plan_not_found', code: 'plan_not_found' }, { status: 404 })
  }

  const {
    createPendingSubscription,
    activateSubscription,
    getActiveEntitlement,
    recordSubscriptionEvent,
  } = await import('@/lib/jobs/employer-subscription')

  const amount = normalizeMoneyAmount(plan.price)

  // Report BS-99: a live PAID entitlement blocks every free path. Without this,
  // switching to the free plan and back minted a fresh unpaid month each time.
  // Checked BEFORE a pending row is created so the attempt leaves no debris.
  const entitlement = await getActiveEntitlement(userId)
  if (entitlement && !entitlement.isFree && amount === 0) {
    await recordSubscriptionEvent({
      userId,
      planId,
      eventType: 'blocked_paid_active',
      previousPeriodEnd: entitlement.periodEnd,
      note: 'free plan selected while paid entitlement is live',
    })
    return NextResponse.json(
      {
        error: 'paid_plan_active',
        code: 'paid_plan_active',
        activeUntil: entitlement.periodEnd,
      },
      { status: 409 }
    )
  }

  const subscriptionId = await createPendingSubscription(userId, planId)
  if (!subscriptionId) {
    return NextResponse.json({ error: 'sub_create_failed', code: 'sub_create_failed' }, { status: 500 })
  }

  // Report BS-38: an admin-granted free month covers a paid plan — activate it
  // without the gateway and burn one month off the company's allowance. When
  // the allowance is spent, the next subscribe falls through to the normal
  // price below. BS-99: only when no entitlement is already running.
  if (amount > 0 && !entitlement) {
    const { consumeFreeMonths } = await import('@/lib/jobs/employer-free-months')
    const granted = await consumeFreeMonths(userId, 1)
    if (granted.ok && granted.consumed > 0) {
      const res = await activateSubscription(subscriptionId, {
        mode: 'free_grant',
        freeMonths: granted.consumed,
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: 'activate_failed', code: 'activate_failed' },
          { status: 500 }
        )
      }
      return NextResponse.json({ subscribed: true, freeMonths: granted.consumed })
    }
  }

  // Free plan: activate immediately, no gateway.
  if (amount === 0) {
    const res = await activateSubscription(subscriptionId, { mode: 'free_plan' })
    if (res.blocked === 'paid_plan_active') {
      return NextResponse.json(
        { error: 'paid_plan_active', code: 'paid_plan_active', activeUntil: res.activeUntil },
        { status: 409 }
      )
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'activate_failed', code: 'activate_failed' }, { status: 500 })
    }
    return NextResponse.json({ subscribed: true })
  }

  if (!isGatewayConfigured(method) && !isPaymentDevMode()) {
    return NextResponse.json(
      { error: 'Payment gateway not configured', code: 'gateway_not_configured' },
      { status: 500 }
    )
  }

  // Report BS-55: enforce the gateway minimum before charging (see processPayment).
  if (method === 'wayl' && !isPaymentDevMode() && amount < getWaylMinAmount()) {
    return NextResponse.json(
      { error: 'amount_below_minimum', code: 'amount_below_minimum', min: getWaylMinAmount() },
      { status: 400 }
    )
  }

  const referenceId = crypto.randomUUID()
  let redirectUrl: string
  try {
    const gatewayArgs = {
      amount,
      referenceId,
      locale,
      productId: subscriptionId,
      paymentType: 'subscription' as const,
    }
    if (method === 'zaincash') {
      redirectUrl = (await initiateZainCashPayment(gatewayArgs)).redirectUrl
    } else if (method === 'wayl') {
      redirectUrl = (await initiateWaylPayment(gatewayArgs)).redirectUrl
    } else {
      redirectUrl = (await initiateQiCardPayment(gatewayArgs)).redirectUrl
    }
  } catch (error) {
    console.error('[payment/initiate] Subscription gateway failed:', error)
    await admin.from('employer_subscriptions').delete().eq('id', subscriptionId)
    return NextResponse.json({ error: 'gateway_error', code: 'gateway_error' }, { status: 500 })
  }

  const { error: paymentError } = await admin.from('payments').insert({
    user_id: userId,
    employer_subscription_id: subscriptionId,
    amount,
    currency: 'IQD',
    method,
    status: 'pending',
    reference_id: referenceId,
  })

  if (paymentError) {
    console.error('[payment/initiate] Subscription payment insert failed:', paymentError)
    await admin.from('employer_subscriptions').delete().eq('id', subscriptionId)
    return NextResponse.json({ error: 'payment_create_failed', code: 'payment_create_failed' }, { status: 500 })
  }

  return NextResponse.json({ redirectUrl })
}

async function processPayment(params: {
  userId: string
  amount: number
  method: PaymentMethod
  locale: string
  courseId?: string
  serviceId?: string
  requirements?: string
  sellerId?: string
  redirectProductId: string
  paymentType: 'course' | 'service'
  coursePricing?: PriceCalculation
  couponId?: string | null
}) {
  const {
    userId,
    amount,
    method,
    locale,
    courseId,
    serviceId,
    requirements,
    sellerId,
    redirectProductId,
    paymentType,
    coursePricing,
    couponId,
  } = params

  if (!isGatewayConfigured(method) && !isPaymentDevMode()) {
    return NextResponse.json(
      { error: 'Payment gateway not configured', code: 'gateway_not_configured' },
      { status: 500 }
    )
  }

  // Report BS-55: reject sub-minimum amounts with a clear buyer-facing code
  // BEFORE creating any order or calling the gateway (Wayl 422s on totals below
  // its floor, which previously surfaced as an opaque "gateway error").
  if (method === 'wayl' && !isPaymentDevMode() && amount < getWaylMinAmount()) {
    return NextResponse.json(
      { error: 'amount_below_minimum', code: 'amount_below_minimum', min: getWaylMinAmount() },
      { status: 400 }
    )
  }

  const referenceId = crypto.randomUUID()
  let redirectUrl: string
  let serviceOrderId: string | null = null
  const admin = createAdminClient()

  if (paymentType === 'service' && serviceId && sellerId) {
    const { data: order, error: orderError } = await admin
      .from('service_orders')
      .insert({
        service_id: serviceId,
        buyer_id: userId,
        seller_id: sellerId,
        requirements,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[payment/initiate] Service order failed:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', code: 'order_create_failed' },
        { status: 500 }
      )
    }

    serviceOrderId = order.id as string
  }

  const gatewayProductId =
    paymentType === 'service' && serviceOrderId
      ? serviceOrderId
      : redirectProductId

  try {
    const gatewayArgs = {
      amount,
      referenceId,
      locale,
      productId: gatewayProductId,
      paymentType,
    }
    if (method === 'zaincash') {
      redirectUrl = (await initiateZainCashPayment(gatewayArgs)).redirectUrl
    } else if (method === 'wayl') {
      redirectUrl = (await initiateWaylPayment(gatewayArgs)).redirectUrl
    } else {
      redirectUrl = (await initiateQiCardPayment(gatewayArgs)).redirectUrl
    }
  } catch (error) {
    console.error('[payment/initiate] Gateway call failed:', error)
    if (serviceOrderId) {
      await admin.from('service_orders').delete().eq('id', serviceOrderId)
    }
    return NextResponse.json(
      { error: 'Payment gateway error', code: 'gateway_error' },
      { status: 500 }
    )
  }

  const { error: paymentError } = await admin.from('payments').insert({
    user_id: userId,
    course_id: courseId ?? null,
    service_order_id: serviceOrderId,
    amount,
    coupon_id: couponId ?? null,
    discount_snapshot: coursePricing
      ? buildDiscountSnapshot(coursePricing)
      : null,
    currency: 'IQD',
    method,
    status: 'pending',
    reference_id: referenceId,
  })

  if (paymentError) {
    console.error('[payment/initiate] Failed to create payment:', paymentError)
    if (serviceOrderId) {
      await admin.from('service_orders').delete().eq('id', serviceOrderId)
    }
    return NextResponse.json(
      { error: 'Failed to create payment', code: 'payment_create_failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ redirectUrl })
}

/**
 * Report BS-70: Company Academy bulk seat purchase. Isolated from processPayment
 * (course/service) to protect that path. Only a company may buy; the price is the
 * admin-tiered bulk total; on payment the purchase is completed + instructor
 * credited (see complete-payment academy branch). Wayl only for now.
 */
async function handleAcademyPayment(
  userId: string,
  courseId: string,
  seats: number,
  method: PaymentMethod,
  locale: string
) {
  const supabase = await createClient()
  const { data: me } = await supabase.from('users').select('role').eq('id', userId).single()
  if (me?.role !== 'company') {
    return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: course } = await admin
    .from('courses')
    .select('id, price, status')
    .eq('id', courseId)
    .maybeSingle()
  if (!course || course.status !== 'published' || !(Number(course.price) > 0)) {
    return NextResponse.json({ error: 'course_not_available', code: 'course_not_available' }, { status: 400 })
  }

  const pricing = computeSeatPricing(
    Number(course.price),
    seats,
    await getAcademySeatTiers()
  )
  if (pricing.bulkTotal < 1) {
    return NextResponse.json({ error: 'invalid', code: 'invalid' }, { status: 400 })
  }

  if (!isGatewayConfigured(method) && !isPaymentDevMode()) {
    return NextResponse.json(
      { error: 'Payment gateway not configured', code: 'gateway_not_configured' },
      { status: 500 }
    )
  }
  if (method === 'wayl' && !isPaymentDevMode() && pricing.bulkTotal < getWaylMinAmount()) {
    return NextResponse.json(
      { error: 'amount_below_minimum', code: 'amount_below_minimum', min: getWaylMinAmount() },
      { status: 400 }
    )
  }

  const { data: purchase, error: purchaseError } = await admin
    .from('academy_purchases')
    .insert({
      company_id: userId,
      course_id: courseId,
      seats: pricing.seats,
      unit_price: pricing.unitPrice,
      discount_pct: pricing.discountPct,
      total_amount: pricing.bulkTotal,
      status: 'pending',
    })
    .select('id')
    .single()
  if (purchaseError || !purchase) {
    console.error('[payment/initiate] academy purchase failed:', purchaseError)
    return NextResponse.json({ error: 'purchase_create_failed', code: 'purchase_create_failed' }, { status: 500 })
  }

  const referenceId = crypto.randomUUID()
  let redirectUrl: string
  try {
    redirectUrl = (
      await initiateWaylPayment({
        amount: pricing.bulkTotal,
        referenceId,
        locale,
        productId: purchase.id as string,
        paymentType: 'academy',
      })
    ).redirectUrl
  } catch (error) {
    console.error('[payment/initiate] academy gateway failed:', error)
    await admin.from('academy_purchases').delete().eq('id', purchase.id)
    return NextResponse.json({ error: 'Payment gateway error', code: 'gateway_error' }, { status: 500 })
  }

  const { error: paymentError } = await admin.from('payments').insert({
    user_id: userId,
    academy_purchase_id: purchase.id,
    amount: pricing.bulkTotal,
    currency: 'IQD',
    method,
    status: 'pending',
    reference_id: referenceId,
  })
  if (paymentError) {
    console.error('[payment/initiate] academy payment insert failed:', paymentError)
    await admin.from('academy_purchases').delete().eq('id', purchase.id)
    return NextResponse.json({ error: 'payment_create_failed', code: 'payment_create_failed' }, { status: 500 })
  }

  return NextResponse.json({ redirectUrl })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      )
    }

    if (!checkPaymentRateLimit(user.id).allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'rate_limited' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = initiateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'invalid_request' },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.type === 'subscription') {
      return handleSubscriptionPayment(user.id, data.planId, data.method, data.locale)
    }

    if (data.type === 'academy') {
      return handleAcademyPayment(user.id, data.courseId, data.seats, data.method, data.locale)
    }

    if (data.type === 'service') {
      if ('skipPayment' in data) {
        return handleServicePaymentSkip(
          user.id,
          data.serviceId,
          data.requirements,
          data.locale
        )
      }

      return handleServicePayment(
        user.id,
        data.serviceId,
        data.requirements,
        data.method,
        data.locale
      )
    }

    return handleCoursePayment(user.id, data.courseId, data.method, data.locale, data.couponCode)
  } catch (error) {
    console.error('[payment/initiate] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 }
    )
  }
}
