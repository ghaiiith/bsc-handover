import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'
import { getRecommendationsCacheTag } from '@/lib/recommendations/get-course-recommendations'

export async function POST() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  revalidateTag(getRecommendationsCacheTag(userId), 'max')
  return NextResponse.json({ success: true })
}
