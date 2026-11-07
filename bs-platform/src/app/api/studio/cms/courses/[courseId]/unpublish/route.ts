import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { unpublishCourse } from '@/lib/studio/cms/courses'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    await unpublishCourse(courseId)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'unpublish_failed', 500)
  }
}
