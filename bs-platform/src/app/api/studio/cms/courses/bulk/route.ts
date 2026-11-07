import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { bulkCourseAction } from '@/lib/studio/cms/courses'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  try {
    const body = (await request.json()) as {
      courseIds: string[]
      action: 'publish' | 'unpublish' | 'archive' | 'delete'
    }
    if (!body.courseIds?.length || !body.action) {
      return cmsError('invalid_request')
    }
    const result = await bulkCourseAction(body.courseIds, body.action)
    return cmsJson(result)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'bulk_failed', 500)
  }
}
