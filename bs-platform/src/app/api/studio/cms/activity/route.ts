import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { getRecentActivity } from '@/lib/studio/cms/search'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const limit = request.nextUrl.searchParams.get('limit')
  try {
    const items = await getRecentActivity(limit ? Number(limit) : 50)
    return cmsJson({ items })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'activity_failed', 500)
  }
}
