import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import {
  archiveCourse,
  deleteCourse,
  duplicateCourse,
  getCourseById,
  publishCourse,
  unpublishCourse,
  updateCourse,
} from '@/lib/studio/cms/courses'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  const course = await getCourseById(courseId)
  if (!course) return cmsError('not_found', 404)
  return cmsJson(course)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    const body = (await request.json()) as Record<string, unknown>
    await updateCourse(courseId, body)
    const course = await getCourseById(courseId)
    return cmsJson(course)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'update_failed', 400)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    await deleteCourse(courseId)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'delete_failed', 500)
  }
}
