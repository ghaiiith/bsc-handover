import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sourceVideoKey } from '@/lib/storage/object-keys'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { syncCourseLessonStats } from '@/lib/studio/sync-course-stats'
import { getVideoAssetById } from '@/lib/video/video-asset-service'

export const runtime = 'nodejs'

const bodySchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  sourceAssetId: z.string().uuid(),
  durationMinutes: z.number().int().min(1).optional(),
})

/** Links the processed source asset to a lesson and marks it ready for playback. */
export async function POST(request: Request) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const asset = await getVideoAssetById(parsed.sourceAssetId)
  if (!asset || asset.course_id !== parsed.courseId) {
    return NextResponse.json({ error: 'asset_not_found' }, { status: 404 })
  }

  const expectedKey = sourceVideoKey(parsed.courseId, parsed.lessonId)
  if (asset.object_key !== expectedKey) {
    return NextResponse.json({ error: 'asset_key_mismatch' }, { status: 400 })
  }

  if (asset.status !== 'ready') {
    return NextResponse.json({ error: 'asset_not_ready' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: lesson } = await db
    .from('lessons')
    .select('id, course_id')
    .eq('id', parsed.lessonId)
    .eq('course_id', parsed.courseId)
    .maybeSingle()

  if (!lesson) {
    return NextResponse.json({ error: 'lesson_not_found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {
    video_asset_id: parsed.sourceAssetId,
  }
  if (parsed.durationMinutes != null) {
    updates.duration_minutes = parsed.durationMinutes
  } else if (asset.duration_seconds != null) {
    updates.duration_minutes = Math.max(1, Math.ceil(asset.duration_seconds / 60))
  }

  const { error } = await db
    .from('lessons')
    .update(updates)
    .eq('id', parsed.lessonId)
    .eq('course_id', parsed.courseId)

  if (error) {
    console.error('[studio/publish] lesson update failed:', error.message)
    return NextResponse.json(
      { error: 'publish_failed', detail: error.message },
      { status: 500 }
    )
  }

  await syncCourseLessonStats(parsed.courseId)

  return NextResponse.json({
    ok: true,
    lessonId: parsed.lessonId,
    videoAssetId: parsed.sourceAssetId,
    durationMinutes: updates.duration_minutes,
  })
}
