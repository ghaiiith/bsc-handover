import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { createLesson, reorderLessons } from '@/lib/studio/cms/lessons'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'
import type { LessonType } from '@/types'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    const body = (await request.json()) as {
      sectionId: string
      title: string
      title_ar: string
      duration_minutes?: number
      is_free_preview?: boolean
      lesson_type?: LessonType
    }
    const result = await createLesson(courseId, body.sectionId, body)
    return cmsJson(result, 201)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'create_failed', 400)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    const body = (await request.json()) as { sectionId: string; lessonIds: string[] }
    await reorderLessons(courseId, body.sectionId, body.lessonIds)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'reorder_failed', 400)
  }
}
