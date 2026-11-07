import { NextResponse } from 'next/server'
import { getActiveCourseDiscounts, calculatePrice } from '@/lib/discounts'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const [active, pricing] = await Promise.all([
      getActiveCourseDiscounts(courseId),
      calculatePrice(courseId).catch(() => null),
    ])

    return NextResponse.json({
      admin: active.admin,
      instructor: active.instructor,
      pricing,
    })
  } catch (error) {
    console.error('[discounts/course]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
