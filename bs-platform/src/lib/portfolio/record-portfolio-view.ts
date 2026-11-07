import 'server-only'

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

export async function recordPortfolioViewFromRequest(
  portfolioUserId: string,
  viewerUserId: string | null,
  request: Request
): Promise<void> {
  if (viewerUserId && viewerUserId === portfolioUserId) {
    return
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0]?.trim() || 'unknown'
    : request.headers.get('x-real-ip')?.trim() || 'unknown'

  const admin = createAdminClient()
  await admin.from('portfolio_views').insert({
    user_id: portfolioUserId,
    viewer_ip: hashIp(ip),
    viewer_country: request.headers.get('x-vercel-ip-country'),
  })
}
