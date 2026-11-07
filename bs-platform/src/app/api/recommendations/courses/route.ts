import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'
import { getCourseRecommendations } from '@/lib/recommendations/get-course-recommendations'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

export async function POST() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rateCheck = await checkDurableRateLimit({
    key: `reco:courses:user:${userId}`,
    max: 20,
    windowSeconds: 3600,
  })
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const locale = await getLocale()
  const result = await getCourseRecommendations(userId, locale)
  return NextResponse.json(result)
}
