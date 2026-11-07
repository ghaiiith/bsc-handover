import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { moveLesson, setLessonLocked, unlinkLessonVideo } from '@/lib/studio/cms/lessons'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string; lessonId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId, lessonId } = await context.params
  try {
    const body = (await request.json()) as {
      action: 'move' | 'lock' | 'unlock' | 'unlink_video'
      targetSectionId?: string
      orderIndex?: number
    }

    if (body.action === 'move') {
      if (!body.targetSectionId || body.orderIndex == null) return cmsError('invalid_request')
      await moveLesson(courseId, lessonId, body.targetSectionId, body.orderIndex)
    } else if (body.action === 'lock') {
      await setLessonLocked(courseId, lessonId, true)
    } else if (body.action === 'unlock') {
      await setLessonLocked(courseId, lessonId, false)
    } else if (body.action === 'unlink_video') {
      await unlinkLessonVideo(courseId, lessonId)
    } else {
      return cmsError('invalid_action')
    }

    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'action_failed', 400)
  }
}
