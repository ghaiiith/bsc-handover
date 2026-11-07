import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import {
  createLesson,
  deleteLesson,
  duplicateLesson,
  getLessonDetail,
  moveLesson,
  reorderLessons,
  setLessonLocked,
  unlinkLessonVideo,
  updateLesson,
} from '@/lib/studio/cms/lessons'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'
import type { LessonType } from '@/types'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string; lessonId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId, lessonId } = await context.params
  const lesson = await getLessonDetail(courseId, lessonId)
  if (!lesson) return cmsError('not_found', 404)
  return cmsJson(lesson)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId, lessonId } = await context.params
  try {
    const body = (await request.json()) as Record<string, unknown>
    await updateLesson(courseId, lessonId, body)
    const lesson = await getLessonDetail(courseId, lessonId)
    return cmsJson(lesson)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'update_failed', 400)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId, lessonId } = await context.params
  try {
    await deleteLesson(courseId, lessonId)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'delete_failed', 500)
  }
}
