import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyInstructorCourseAccess } from '@/lib/instructor/verify-course-owner'
import { isStorageConfigured } from '@/lib/storage/provider'
import { getDefaultUploadProvider } from '@/lib/video-providers/provider-factory'
import { resolveUploadProviderId } from '@/lib/video-providers/provider-settings'
import { MAX_VIDEO_SIZE_MB } from '@/lib/constants'

export const runtime = 'nodejs'

const MAX_PARTS = 10000

const bodySchema = z.object({
  slot: z.enum(['lesson', 'preview']),
  lessonId: z.string().uuid().optional().nullable(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  partCount: z.number().int().min(1).max(MAX_PARTS).optional(),
  /** Optional override — defaults to platform setting (Vimeo). */
  provider: z.enum(['vimeo', 'r2']).optional(),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params

  const access = await verifyInstructorCourseAccess(courseId)
  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const providerId =
    parsed.provider ??
    (await resolveUploadProviderId({
      courseId,
      lessonId: parsed.lessonId ?? undefined,
    }))

  if (providerId === 'r2' && !isStorageConfigured()) {
    return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 })
  }

  const isVideo =
    parsed.contentType.startsWith('video/') ||
    parsed.filename.match(/\.(mp4|mov|mkv|avi|webm)$/i)
  if (!isVideo) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }

  if (parsed.fileSize > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  if (parsed.slot === 'lesson' && !parsed.lessonId) {
    return NextResponse.json({ error: 'lesson_required' }, { status: 400 })
  }

  try {
    const provider =
      parsed.provider != null
        ? await (await import('@/lib/video-providers/provider-factory')).getVideoProvider(
            parsed.provider
          )
        : await getDefaultUploadProvider()

    const result = await provider.createUpload({
      courseId,
      lessonId: parsed.lessonId,
      slot: parsed.slot,
      filename: parsed.filename,
      contentType: parsed.contentType,
      fileSize: parsed.fileSize,
      partCount: parsed.partCount,
      createdBy: access.userId,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[videos/create-upload] failed:', err)
    return NextResponse.json({ error: 'upload_init_failed' }, { status: 502 })
  }
}
