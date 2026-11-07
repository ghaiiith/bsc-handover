import { NextResponse } from 'next/server'
import { countActiveDiscounts } from '@/lib/discounts'

export async function GET() {
  try {
    const count = await countActiveDiscounts()
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
