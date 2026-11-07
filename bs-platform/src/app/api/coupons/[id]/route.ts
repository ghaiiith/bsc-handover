import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Coupon } from '@/types'

async function canManageCoupon(userId: string, coupon: Coupon): Promise<boolean> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') return true
  return coupon.created_by === userId && coupon.party === 'instructor'
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
    const { data: coupon, error: fetchError } = await admin
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !coupon) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!(await canManageCoupon(user.id, coupon as Coupon))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('coupons')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[coupons/delete]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
