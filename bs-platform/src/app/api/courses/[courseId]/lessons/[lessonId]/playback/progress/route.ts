import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed || !access.user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('lesson_progress')
    .select('watch_position_seconds, completion_percent, last_watched_at, completed')
    .eq('student_id', access.user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  return NextResponse.json({
    watchPositionSeconds: Number(data?.watch_position_seconds ?? 0),
    completionPercent: Number(data?.completion_percent ?? 0),
    lastWatchedAt: (data?.last_watched_at as string) ?? null,
    completed: data?.completed === true,
  })
}

interface ProgressPutBody {
  watchPositionSeconds: number
  completionPercent: number
  deviceInfo?: string
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed || !access.user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: ProgressPutBody
  try {
    body = (await request.json()) as ProgressPutBody
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: access.user.id,
      lesson_id: lessonId,
      watch_position_seconds: Math.max(0, body.watchPositionSeconds),
      completion_percent: Math.min(100, Math.max(0, body.completionPercent)),
      last_watched_at: new Date().toISOString(),
      device_info: body.deviceInfo ? { userAgent: body.deviceInfo } : null,
    },
    { onConflict: 'student_id,lesson_id' }
  )

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
