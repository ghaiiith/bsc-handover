import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DiscountValidationError,
  validateCombinedDiscounts,
  validateDiscountPercentage,
  getActiveCourseDiscounts,
} from '@/lib/discounts'
import { ensureActiveRevenueAgreement } from '@/lib/revenue/agreements'
import type { DiscountParty } from '@/types'

const createSchema = z.object({
  course_id: z.string().uuid(),
  discount_percentage: z.number().positive().max(100),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }),
  label: z.string().max(120).optional(),
  label_ar: z.string().max(120).optional(),
  is_full_override: z.boolean().optional().default(false),
})

async function resolveParty(
  userId: string,
  courseId: string
): Promise<{ party: DiscountParty } | { error: string; status: number }> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') {
    return { party: 'admin' }
  }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (!course || course.instructor_id !== userId) {
    return { error: 'Forbidden', status: 403 }
  }

  return { party: 'instructor' }
}

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

    const {
      course_id,
      discount_percentage,
      starts_at,
      ends_at,
      label,
      label_ar,
      is_full_override,
    } = parsed.data

    const partyResult = await resolveParty(user.id, course_id)
    if ('error' in partyResult) {
      return NextResponse.json(
        { error: partyResult.error },
        { status: partyResult.status }
      )
    }

    const party = partyResult.party

    // Full-override (discount off the total price, up to 100%) is an
    // admin-only capability. Instructors and normal party caps still apply.
    const fullOverride = is_full_override && party === 'admin'

    try {
      if (!fullOverride) {
        await validateDiscountPercentage(party, discount_percentage, course_id)
        await validateCombinedDiscounts(course_id, party, discount_percentage)
      }
    } catch (err) {
      if (err instanceof DiscountValidationError) {
        return NextResponse.json({ error: err.code }, { status: 400 })
      }
      throw err
    }

    const endsAt = new Date(ends_at)
    if (endsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'ends_at_must_be_future' }, { status: 400 })
    }

    const active = await getActiveCourseDiscounts(course_id)
    if (
      (party === 'admin' && active.admin) ||
      (party === 'instructor' && active.instructor)
    ) {
      return NextResponse.json(
        {
          error:
            'لديك خصم نشط بالفعل على هذا الكورس. أنهِه أولاً أو عدّل عليه',
          code: 'already_active',
        },
        { status: 409 }
      )
    }

    const admin = createAdminClient()

    // Report BS-56/57: the validate_discount_party_limit DB trigger rejects the
    // insert if the course instructor has no active agreement. Provision the
    // platform-default agreement first (idempotent) so the discount publishes.
    const { data: courseRow } = await admin
      .from('courses')
      .select('instructor_id')
      .eq('id', course_id)
      .maybeSingle()
    if (courseRow?.instructor_id) {
      await ensureActiveRevenueAgreement(courseRow.instructor_id as string)
    }

    const { data, error } = await admin
      .from('course_discounts')
      .insert({
        course_id,
        created_by: user.id,
        party,
        discount_percentage,
        is_full_override: fullOverride,
        starts_at: starts_at ?? new Date().toISOString(),
        ends_at,
        label: label ?? null,
        label_ar: label_ar ?? null,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error:
              'لديك خصم نشط بالفعل على هذا الكورس. أنهِه أولاً أو عدّل عليه',
            code: 'already_active',
          },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ discount: data })
  } catch (error) {
    console.error('[discounts/create]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
