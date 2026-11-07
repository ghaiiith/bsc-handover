import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  COUPON_CODE_PATTERN,
  DiscountValidationError,
  generateCouponCode,
  normalizeCouponCode,
  validateDiscountPercentage,
} from '@/lib/discounts'
import { ensureActiveRevenueAgreement } from '@/lib/revenue/agreements'
import type { CouponScope, DiscountParty } from '@/types'

const createSchema = z.object({
  code: z.string().max(20).optional(),
  scope: z.enum(['platform', 'course']),
  course_id: z.string().uuid().optional(),
  discount_percentage: z.number().positive().max(100),
  max_uses: z.number().int().positive(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const party: DiscountParty = isAdmin ? 'admin' : 'instructor'

    if (parsed.data.scope === 'platform' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (parsed.data.scope === 'course') {
      if (!parsed.data.course_id) {
        return NextResponse.json({ error: 'course_required' }, { status: 400 })
      }

      if (!isAdmin) {
        const { data: course } = await supabase
          .from('courses')
          .select('instructor_id')
          .eq('id', parsed.data.course_id)
          .single()

        if (!course || course.instructor_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    try {
      await validateDiscountPercentage(
        party,
        parsed.data.discount_percentage,
        parsed.data.scope === 'course' ? parsed.data.course_id : null
      )
    } catch (err) {
      if (err instanceof DiscountValidationError) {
        return NextResponse.json({ error: err.code }, { status: 400 })
      }
      throw err
    }

    const code = parsed.data.code?.trim()
      ? normalizeCouponCode(parsed.data.code)
      : await generateCouponCode(isAdmin ? 'EDU' : 'INST')

    if (!COUPON_CODE_PATTERN.test(code)) {
      return NextResponse.json({ error: 'invalid_code_format' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Report BS-56: a DB trigger (validate_discount_party_limit) rejects a
    // course-scoped discount when the course instructor has no active revenue
    // agreement. Provision the platform-default agreement first so creation
    // succeeds and later payouts use that same real agreement id.
    if (parsed.data.scope === 'course' && parsed.data.course_id) {
      const { data: courseRow } = await admin
        .from('courses')
        .select('instructor_id')
        .eq('id', parsed.data.course_id)
        .maybeSingle()
      if (courseRow?.instructor_id) {
        await ensureActiveRevenueAgreement(courseRow.instructor_id as string)
      }
    }

    const { data: existing } = await admin
      .from('coupons')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'code_exists', code: 'code_exists' }, { status: 409 })
    }

    const { data, error } = await admin
      .from('coupons')
      .insert({
        code,
        created_by: user.id,
        party,
        scope: parsed.data.scope as CouponScope,
        course_id:
          parsed.data.scope === 'course' ? parsed.data.course_id ?? null : null,
        discount_percentage: parsed.data.discount_percentage,
        max_uses: parsed.data.max_uses,
        starts_at: parsed.data.starts_at ?? new Date().toISOString(),
        ends_at: parsed.data.ends_at ?? null,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'code_exists', code: 'code_exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupon: data })
  } catch (error) {
    console.error('[coupons/create]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
