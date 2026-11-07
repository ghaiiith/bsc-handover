import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { ensureActiveRevenueAgreement } from '@/lib/revenue/agreements'
import { calculateRevenueBreakdown } from '@/lib/revenue/commission-engine'

import type { RevenueDiscountContext } from '@/lib/revenue/types'

export interface ApplySnapshotParams {
  paymentId: string
  instructorId: string
  grossAmount: number
  method: string
  /** Report BS-48: resolved discount attribution, if a discount was applied. */
  discount?: RevenueDiscountContext | null
  /**
   * Report BS-78: per-course admin override of the PLATFORM percentage. When set,
   * it overrides the instructor agreement's split for this payout (the agreement
   * id is still recorded for audit/FK).
   */
  overridePlatformPct?: number | null
}

/**
 * Report BS-48: turn a payment's stored discount_snapshot into a party-attributed
 * discount context. The coupon's discount is charged to the party that issued it
 * (coupon.party), the admin discount to the platform, the instructor discount to
 * the instructor. Returns null when there was no discount.
 */
export async function resolveDiscountContext(
  snapshot: Record<string, unknown> | null | undefined
): Promise<RevenueDiscountContext | null> {
  if (!snapshot) return null
  const original = Math.round(Number(snapshot.original ?? 0))
  const adminPct = Number(snapshot.admin_pct ?? 0)
  const instructorPct = Number(snapshot.instructor_pct ?? 0)
  const couponPct = Number(snapshot.coupon_pct ?? 0)
  if (original <= 0 || adminPct + instructorPct + couponPct <= 0) return null

  let platformDiscountAmount = original * (adminPct / 100)
  let instructorDiscountAmount = original * (instructorPct / 100)

  if (couponPct > 0) {
    const couponAmount = original * (couponPct / 100)
    // A coupon belongs to a party; that party bears its cost. Default to the
    // platform (admin) when the party can't be resolved.
    let couponParty: 'admin' | 'instructor' = 'admin'
    const couponId = snapshot.coupon_id as string | null | undefined
    if (couponId) {
      const admin = createAdminClient()
      const { data } = await admin
        .from('coupons')
        .select('party')
        .eq('id', couponId)
        .maybeSingle()
      if (data?.party === 'instructor') couponParty = 'instructor'
    }
    if (couponParty === 'instructor') instructorDiscountAmount += couponAmount
    else platformDiscountAmount += couponAmount
  }

  return {
    originalAmount: original,
    platformDiscountAmount: Math.round(platformDiscountAmount),
    instructorDiscountAmount: Math.round(instructorDiscountAmount),
  }
}

/**
 * Computes and persists immutable financial snapshot on a payment row.
 * Idempotent: skips if snapshot already applied.
 */
export async function applyFinancialSnapshot(
  params: ApplySnapshotParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('payments')
    .select('id, financial_snapshot_at, status')
    .eq('id', params.paymentId)
    .maybeSingle()

  if (!existing) return { ok: false, error: 'payment_not_found' }
  if (existing.financial_snapshot_at) return { ok: true }

  // Report BS-55: credit the instructor at their custom split, or the platform
  // default when they have no explicit agreement (auto-provisioned here so the
  // payout snapshot always has a real, FK-valid agreement id).
  let agreement
  try {
    agreement = await ensureActiveRevenueAgreement(params.instructorId)
  } catch {
    return { ok: false, error: 'no_revenue_agreement' }
  }

  const breakdown = await calculateRevenueBreakdown({
    grossAmount: params.grossAmount,
    gatewayId: params.method,
    instructorId: params.instructorId,
    agreement: {
      id: agreement.id,
      // Report BS-78: a per-course override wins over the agreement's split.
      platform_percentage:
        params.overridePlatformPct != null
          ? params.overridePlatformPct
          : agreement.platform_percentage,
      instructor_percentage:
        params.overridePlatformPct != null
          ? 100 - params.overridePlatformPct
          : agreement.instructor_percentage,
    },
    discount: params.discount ?? null,
  })

  const now = new Date().toISOString()

  const { error } = await admin
    .from('payments')
    .update({
      gross_amount: breakdown.grossAmount,
      gateway_type: breakdown.gatewayType,
      gateway_percentage: breakdown.gatewayPercentage,
      gateway_fixed_fee: breakdown.gatewayFixedFee,
      gateway_total_fee: breakdown.gatewayTotalFee,
      net_received_amount: breakdown.netReceivedAmount,
      platform_percentage: breakdown.platformPercentage,
      instructor_percentage: breakdown.instructorPercentage,
      platform_revenue: breakdown.platformRevenue,
      instructor_revenue: breakdown.instructorRevenue,
      agreement_id: breakdown.agreementId,
      exchange_rate: breakdown.exchangeRate ?? null,
      financial_snapshot_at: now,
    })
    .eq('id', params.paymentId)
    .is('financial_snapshot_at', null)

  if (error) return { ok: false, error: 'snapshot_failed' }
  return { ok: true }
}

/** Resolve instructor id from a payment row (course, service, or academy). */
export async function resolvePaymentInstructorId(payment: {
  course_id?: string | null
  service_order_id?: string | null
  academy_purchase_id?: string | null
}): Promise<string | null> {
  const admin = createAdminClient()

  if (payment.course_id) {
    const { data } = await admin
      .from('courses')
      .select('instructor_id')
      .eq('id', payment.course_id)
      .maybeSingle()
    return (data?.instructor_id as string | null) ?? null
  }

  if (payment.service_order_id) {
    const { data } = await admin
      .from('service_orders')
      .select('seller_id')
      .eq('id', payment.service_order_id)
      .maybeSingle()
    return (data?.seller_id as string | null) ?? null
  }

  // Report BS-70: an academy purchase credits the purchased course's instructor.
  if (payment.academy_purchase_id) {
    const { data } = await admin
      .from('academy_purchases')
      .select('course:courses(instructor_id)')
      .eq('id', payment.academy_purchase_id)
      .maybeSingle()
    const course = (data as { course?: { instructor_id?: string } | { instructor_id?: string }[] } | null)?.course
    const resolved = Array.isArray(course) ? course[0] : course
    return (resolved?.instructor_id as string | null) ?? null
  }

  return null
}

/**
 * Report BS-78: the per-course platform-% override for a payment, if the course
 * (direct or via an academy purchase) has one set; otherwise null.
 */
export async function resolveCoursePlatformOverride(payment: {
  course_id?: string | null
  academy_purchase_id?: string | null
}): Promise<number | null> {
  const admin = createAdminClient()
  let courseId = payment.course_id ?? null
  if (!courseId && payment.academy_purchase_id) {
    const { data } = await admin
      .from('academy_purchases')
      .select('course_id')
      .eq('id', payment.academy_purchase_id)
      .maybeSingle()
    courseId = (data?.course_id as string | null) ?? null
  }
  if (!courseId) return null
  const { data } = await admin
    .from('courses')
    .select('platform_commission_pct')
    .eq('id', courseId)
    .maybeSingle()
  const pct = data?.platform_commission_pct
  return pct === null || pct === undefined ? null : Number(pct)
}

export async function applyFinancialSnapshotForPayment(
  paymentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: payment } = await admin
    .from('payments')
    .select(
      'id, amount, method, course_id, service_order_id, academy_purchase_id, financial_snapshot_at, discount_snapshot'
    )
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment) return { ok: false, error: 'payment_not_found' }
  if (payment.financial_snapshot_at) return { ok: true }

  const instructorId = await resolvePaymentInstructorId(payment)
  if (!instructorId) return { ok: false, error: 'instructor_not_found' }

  const discount = await resolveDiscountContext(
    payment.discount_snapshot as Record<string, unknown> | null
  )

  return applyFinancialSnapshot({
    paymentId,
    instructorId,
    grossAmount: Number(payment.amount),
    method: payment.method as string,
    discount,
    overridePlatformPct: await resolveCoursePlatformOverride(payment),
  })
}
