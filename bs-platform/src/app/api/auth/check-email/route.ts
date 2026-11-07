import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  checkEmailRateLimit,
  getClientIp,
} from '@/lib/auth/email-check-rate-limit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rate = checkEmailRateLimit(ip)

  if (!rate.allowed) {
    return NextResponse.json({ available: false, error: 'rate_limited' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ available: false, error: 'invalid_email' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('[check-email]', error.message)
      return NextResponse.json({ available: true })
    }

    return NextResponse.json({ available: !data })
  } catch {
    return NextResponse.json({ available: true })
  }
}
