import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  calculatePrice,
  validateCoupon,
} from '@/lib/discounts'
import { checkCouponValidateRateLimit } from '@/lib/discounts/rate-limit'

const schema = z.object({
  code: z.string().min(1).max(20),
  courseId: z.string().uuid(),
})

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'كود الخصم غير صحيح',
  expired: 'كود الخصم منتهي الصلاحية',
  already_used: 'تم استخدام هذا الكود مسبقاً',
  max_reached: 'وصل الكود للحد الأقصى من الاستخدام',
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    if (!checkCouponValidateRateLimit(ip).allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { code, courseId } = parsed.data

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const validation = await validateCoupon(code, courseId, user?.id)
    if (!validation.valid) {
      return NextResponse.json({
        coupon_valid: false,
        coupon_error: ERROR_MESSAGES[validation.error] ?? ERROR_MESSAGES.invalid,
        coupon_error_code: validation.error,
      })
    }

    const pricing = await calculatePrice(courseId, code)

    if (!pricing.coupon_id) {
      return NextResponse.json({
        coupon_valid: false,
        coupon_error: ERROR_MESSAGES.invalid,
        coupon_error_code: 'invalid',
      })
    }

    return NextResponse.json({
      ...pricing,
      coupon_valid: true,
    })
  } catch (error) {
    console.error('[coupons/validate]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
