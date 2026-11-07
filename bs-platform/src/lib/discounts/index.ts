import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCourseCommissionSplit,
  getDefaultCommissionSplit,
} from '@/lib/admin/platform-settings'
import type {
  Coupon,
  CourseDiscount,
  DiscountParty,
  PriceCalculation,
} from '@/types'

export class DiscountValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'DiscountValidationError'
  }
}

type RpcPriceRow = {
  original_price: number | string
  admin_discount_pct: number | string
  instructor_discount_pct: number | string
  coupon_discount_pct: number | string
  total_discount_pct: number | string
  final_price: number | string
  coupon_id: string | null
  admin_discount_id: string | null
  instructor_discount_id: string | null
  savings: number | string
}

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0
  return Number(value)
}

function mapRpcRow(row: RpcPriceRow): PriceCalculation {
  return {
    original_price: Math.round(toNum(row.original_price)),
    admin_discount_pct: toNum(row.admin_discount_pct),
    instructor_discount_pct: toNum(row.instructor_discount_pct),
    coupon_discount_pct: toNum(row.coupon_discount_pct),
    total_discount_pct: toNum(row.total_discount_pct),
    final_price: Math.round(toNum(row.final_price)),
    coupon_id: row.coupon_id ?? undefined,
    admin_discount_id: row.admin_discount_id ?? undefined,
    instructor_discount_id: row.instructor_discount_id ?? undefined,
    savings: Math.round(toNum(row.savings)),
  }
}

/**
 * Max discount % a party may apply. When a course id is given the cap comes
 * from that course's instructor split; otherwise it uses the platform default
 * (e.g. platform-scoped coupons that aren't tied to a single course).
 */
export async function getPartyDiscountCap(
  party: DiscountParty,
  courseId?: string | null
): Promise<number> {
  // Report BS-56/57: fall back to the platform default split instead of throwing
  // `no_revenue_agreement`. The cap is the party's share of the price, so an
  // instructor on the default 30/70 split can discount up to their 70%.
  const split =
    (courseId ? await getCourseCommissionSplit(courseId) : null) ??
    (await getDefaultCommissionSplit())
  return party === 'admin' ? split.adminPct : split.instructorPct
}

export async function validateDiscountPercentage(
  party: DiscountParty,
  percentage: number,
  courseId?: string | null
): Promise<void> {
  if (percentage <= 0 || percentage > 100) {
    throw new DiscountValidationError('Invalid percentage', 'invalid_percentage')
  }

  const cap = await getPartyDiscountCap(party, courseId)
  if (percentage > cap) {
    throw new DiscountValidationError(
      `${party} max is ${cap}%`,
      party === 'admin' ? 'admin_max_exceeded' : 'instructor_max_exceeded'
    )
  }
}

export async function getActiveCourseDiscounts(courseId: string): Promise<{
  admin: CourseDiscount | null
  instructor: CourseDiscount | null
}> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('course_discounts')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .lte('starts_at', now)
    .gt('ends_at', now)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as CourseDiscount[]
  return {
    admin: rows.find((row) => row.party === 'admin') ?? null,
    instructor: rows.find((row) => row.party === 'instructor') ?? null,
  }
}

export async function validateCombinedDiscounts(
  courseId: string,
  party: DiscountParty,
  percentage: number
): Promise<void> {
  const active = await getActiveCourseDiscounts(courseId)
  const other =
    party === 'admin' ? active.instructor : active.admin
  const otherPct = other ? Number(other.discount_percentage) : 0
  if (otherPct + percentage > 100) {
    throw new DiscountValidationError(
      'Combined discounts exceed 100%',
      'combined_max_exceeded'
    )
  }
}

export async function calculatePrice(
  courseId: string,
  couponCode?: string | null
): Promise<PriceCalculation> {
  const admin = createAdminClient()
  const normalizedCode = couponCode?.trim()
    ? couponCode.toUpperCase().trim()
    : null

  const { data, error } = await admin.rpc('calculate_course_price', {
    p_course_id: courseId,
    p_coupon_code: normalizedCode,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Price calculation failed')
  }

  return mapRpcRow(row as RpcPriceRow)
}

export async function calculatePricesForCourses(
  courseIds: string[]
): Promise<Map<string, PriceCalculation>> {
  const results = await Promise.all(
    courseIds.map(async (id) => {
      try {
        const price = await calculatePrice(id)
        return [id, price] as const
      } catch {
        return [id, null] as const
      }
    })
  )

  const map = new Map<string, PriceCalculation>()
  for (const [id, price] of results) {
    if (price) map.set(id, price)
  }
  return map
}

export type CouponValidationResult =
  | { valid: true; discount_percentage: number; coupon_id: string }
  | { valid: false; error: string }

export async function validateCoupon(
  code: string,
  courseId: string,
  userId?: string
): Promise<CouponValidationResult> {
  const admin = createAdminClient()
  const normalized = code.toUpperCase().trim()

  if (!normalized) {
    return { valid: false, error: 'invalid' }
  }

  const { data: coupon, error } = await admin
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (error || !coupon) {
    return { valid: false, error: 'invalid' }
  }

  const row = coupon as Coupon
  const now = Date.now()

  if (!row.is_active) {
    return { valid: false, error: 'invalid' }
  }

  if (new Date(row.starts_at).getTime() > now) {
    return { valid: false, error: 'invalid' }
  }

  if (row.ends_at && new Date(row.ends_at).getTime() <= now) {
    return { valid: false, error: 'expired' }
  }

  if (row.max_uses != null && row.current_uses >= row.max_uses) {
    return { valid: false, error: 'max_reached' }
  }

  if (row.scope === 'course' && row.course_id !== courseId) {
    return { valid: false, error: 'invalid' }
  }

  if (userId) {
    const { data: redemption } = await admin
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', row.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (redemption) {
      return { valid: false, error: 'already_used' }
    }
  }

  return {
    valid: true,
    discount_percentage: Number(row.discount_percentage),
    coupon_id: row.id,
  }
}

export function buildDiscountSnapshot(price: PriceCalculation) {
  return {
    original: price.original_price,
    admin_pct: price.admin_discount_pct,
    instructor_pct: price.instructor_discount_pct,
    coupon_pct: price.coupon_discount_pct,
    total_pct: price.total_discount_pct,
    final: price.final_price,
    admin_discount_id: price.admin_discount_id ?? null,
    instructor_discount_id: price.instructor_discount_id ?? null,
    coupon_id: price.coupon_id ?? null,
  }
}

export function priceFromSnapshot(
  snapshot: Record<string, unknown>
): PriceCalculation {
  return {
    original_price: Math.round(Number(snapshot.original ?? 0)),
    admin_discount_pct: Number(snapshot.admin_pct ?? 0),
    instructor_discount_pct: Number(snapshot.instructor_pct ?? 0),
    coupon_discount_pct: Number(snapshot.coupon_pct ?? 0),
    total_discount_pct: Number(snapshot.total_pct ?? 0),
    final_price: Math.round(Number(snapshot.final ?? 0)),
    admin_discount_id: (snapshot.admin_discount_id as string) ?? undefined,
    instructor_discount_id: (snapshot.instructor_discount_id as string) ?? undefined,
    coupon_id: (snapshot.coupon_id as string) ?? undefined,
    savings: Math.round(
      Number(snapshot.original ?? 0) - Number(snapshot.final ?? 0)
    ),
  }
}

export async function logDiscountPurchase(
  price: PriceCalculation,
  courseId: string,
  userId: string,
  paymentId: string,
  couponId?: string | null
): Promise<void> {
  const admin = createAdminClient()
  const discountIds = [
    price.admin_discount_id,
    price.instructor_discount_id,
  ].filter((id): id is string => Boolean(id))

  await admin.from('discount_logs').insert({
    course_id: courseId,
    user_id: userId,
    payment_id: paymentId,
    original_price: price.original_price,
    admin_discount_pct: price.admin_discount_pct,
    instructor_discount_pct: price.instructor_discount_pct,
    coupon_discount_pct: price.coupon_discount_pct,
    total_discount_pct: price.total_discount_pct,
    final_price: price.final_price,
    coupon_id: couponId ?? price.coupon_id ?? null,
    discount_ids: discountIds.length ? discountIds : null,
  })
}

export async function redeemCoupon(
  couponId: string,
  userId: string,
  courseId: string,
  paymentId: string,
  priceData: PriceCalculation
): Promise<void> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', couponId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    throw new DiscountValidationError('Coupon already used', 'already_used')
  }

  const { data: coupon } = await admin
    .from('coupons')
    .select('current_uses, max_uses, discount_percentage')
    .eq('id', couponId)
    .single()

  if (!coupon) {
    throw new DiscountValidationError('Coupon not found', 'invalid')
  }

  if (
    coupon.max_uses != null &&
    Number(coupon.current_uses) >= Number(coupon.max_uses)
  ) {
    throw new DiscountValidationError('Max uses reached', 'max_reached')
  }

  const { error: redeemError } = await admin.from('coupon_redemptions').insert({
    coupon_id: couponId,
    user_id: userId,
    course_id: courseId,
    payment_id: paymentId,
    discount_percentage_applied: priceData.coupon_discount_pct,
    original_price: priceData.original_price,
    final_price: priceData.final_price,
  })

  if (redeemError) {
    throw new Error(redeemError.message)
  }

  const { error: incrementError } = await admin
    .from('coupons')
    .update({ current_uses: Number(coupon.current_uses) + 1 })
    .eq('id', couponId)

  if (incrementError) {
    throw new Error(incrementError.message)
  }

  await logDiscountPurchase(priceData, courseId, userId, paymentId, couponId)
}

export async function generateCouponCode(prefix = 'EDU'): Promise<string> {
  const admin = createAdminClient()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const safePrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EDU'

  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${safePrefix}-${segment(4)}-${segment(4)}`
    const { data } = await admin
      .from('coupons')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (!data) return code
  }

  throw new Error('Failed to generate unique coupon code')
}

export const COUPON_CODE_PATTERN = /^[A-Z0-9-]{4,20}$/

export function normalizeCouponCode(code: string): string {
  return code.toUpperCase().trim()
}

export async function countActiveDiscounts(): Promise<number> {
  try {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    const { count, error } = await admin
      .from('course_discounts')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export async function resolveCourseCheckout(
  courseId: string,
  userId: string,
  couponCode?: string
): Promise<
  | { ok: true; pricing: PriceCalculation; couponId: string | null }
  | { ok: false; error: string }
> {
  if (couponCode?.trim()) {
    const validation = await validateCoupon(couponCode, courseId, userId)
    if (!validation.valid) {
      return { ok: false, error: `coupon_${validation.error}` }
    }
  }

  try {
    const pricing = await calculatePrice(courseId, couponCode)
    return {
      ok: true,
      pricing,
      couponId: pricing.coupon_id ?? null,
    }
  } catch {
    return { ok: false, error: 'course_not_available' }
  }
}
