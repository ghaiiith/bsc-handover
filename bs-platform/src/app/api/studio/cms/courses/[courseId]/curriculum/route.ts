import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { getCourseCurriculum } from '@/lib/studio/cms/curriculum'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    const curriculum = await getCourseCurriculum(courseId)
    return cmsJson(curriculum)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'curriculum_failed', 500)
  }
}
