import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DiscountValidationError,
  validateCombinedDiscounts,
  validateDiscountPercentage,
} from '@/lib/discounts'
import type { CourseDiscount, DiscountParty } from '@/types'

const patchSchema = z.object({
  discount_percentage: z.number().positive().max(100).optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).optional(),
  label: z.string().max(120).optional().nullable(),
  label_ar: z.string().max(120).optional().nullable(),
})

async function canManageDiscount(
  userId: string,
  discount: CourseDiscount
): Promise<boolean> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') return true

  if (discount.party !== 'instructor' || discount.created_by !== userId) {
    return false
  }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', discount.course_id)
    .single()

  return course?.instructor_id === userId
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: discount, error: fetchError } = await admin
      .from('course_discounts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !discount) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const row = discount as CourseDiscount
    if (!(await canManageDiscount(user.id, row))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const started = new Date(row.starts_at).getTime() <= Date.now()
    const updates: Record<string, unknown> = {}

    if (parsed.data.ends_at) {
      const endsAt = new Date(parsed.data.ends_at)
      if (endsAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'ends_at_must_be_future' }, { status: 400 })
      }
      updates.ends_at = parsed.data.ends_at
    }

    if (started) {
      if (
        parsed.data.discount_percentage != null ||
        parsed.data.starts_at != null ||
        parsed.data.label !== undefined ||
        parsed.data.label_ar !== undefined
      ) {
        const onlyEndsAt =
          parsed.data.ends_at &&
          parsed.data.discount_percentage == null &&
          parsed.data.starts_at == null &&
          parsed.data.label === undefined &&
          parsed.data.label_ar === undefined

        if (!onlyEndsAt) {
          return NextResponse.json(
            { error: 'discount_already_started' },
            { status: 400 }
          )
        }
      }
    } else {
      if (parsed.data.discount_percentage != null) {
        try {
          await validateDiscountPercentage(
            row.party as DiscountParty,
            parsed.data.discount_percentage,
            row.course_id
          )
          await validateCombinedDiscounts(
            row.course_id,
            row.party as DiscountParty,
            parsed.data.discount_percentage
          )
        } catch (err) {
          if (err instanceof DiscountValidationError) {
            return NextResponse.json({ error: err.code }, { status: 400 })
          }
          throw err
        }
        updates.discount_percentage = parsed.data.discount_percentage
      }
      if (parsed.data.starts_at) updates.starts_at = parsed.data.starts_at
      if (parsed.data.label !== undefined) updates.label = parsed.data.label
      if (parsed.data.label_ar !== undefined) updates.label_ar = parsed.data.label_ar
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes' }, { status: 400 })
    }

    const { data: updated, error } = await admin
      .from('course_discounts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ discount: updated })
  } catch (error) {
    console.error('[discounts/patch]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: discount, error: fetchError } = await admin
      .from('course_discounts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !discount) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!(await canManageDiscount(user.id, discount as CourseDiscount))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('course_discounts')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[discounts/delete]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
