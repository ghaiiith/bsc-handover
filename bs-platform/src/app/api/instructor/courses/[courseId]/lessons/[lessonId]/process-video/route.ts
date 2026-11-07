import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyInstructorCourseAccess } from '@/lib/instructor/verify-course-owner'
import { getVideoAssetById } from '@/lib/video/video-asset-service'
import { createProcessingJob } from '@/lib/video/processing-jobs'

export const runtime = 'nodejs'

const bodySchema = z.object({ assetId: z.string().uuid() })

/**
 * Enqueue online transcoding of an already-uploaded raw video into an adaptive
 * HLS ladder. The standalone worker picks the job up; the client polls
 * /api/instructor/video-jobs/[jobId] for progress.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params

  const access = await verifyInstructorCourseAccess(courseId)
  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsed
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const asset = await getVideoAssetById(parsed.assetId)
  if (!asset || asset.course_id !== courseId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const job = await createProcessingJob({
    assetId: asset.id,
    courseId,
    lessonSlot: lessonId,
    sourceKey: asset.object_key,
    createdBy: access.userId,
  })

  if (!job) {
    return NextResponse.json({ error: 'enqueue_failed' }, { status: 500 })
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
  })
}
