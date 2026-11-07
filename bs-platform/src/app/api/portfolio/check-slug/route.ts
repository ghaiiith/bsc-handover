import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkSlugRateLimit, getClientIp } from '@/lib/portfolio/check-slug-rate-limit'
import { isValidPortfolioSlug } from '@/lib/portfolio/slug-validation'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateCheck = checkSlugRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json({ available: false, error: 'rate_limited' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')?.trim().toLowerCase() ?? ''
  const excludeUserId = searchParams.get('excludeUserId')

  if (!isValidPortfolioSlug(slug)) {
    return NextResponse.json({ available: false, error: 'invalid_format', slug })
  }

  const admin = createAdminClient()
  const query = admin.from('users').select('id').eq('portfolio_slug', slug).maybeSingle()

  const { data } = await query

  const taken = Boolean(data && (!excludeUserId || data.id !== excludeUserId))

  return NextResponse.json({ available: !taken, slug })
}
