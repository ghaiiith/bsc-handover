import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'
import type { PlayerBookmark } from '@/types/video-player'

export const runtime = 'nodejs'

function mapBookmark(row: Record<string, unknown>): PlayerBookmark {
  return {
    id: row.id as string,
    timestampSeconds: Number(row.timestamp_seconds),
    title: (row.title as string) ?? null,
    createdAt: row.created_at as string,
  }
}

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
    .from('lesson_bookmarks')
    .select('id, timestamp_seconds, title, created_at')
    .eq('student_id', access.user.id)
    .eq('lesson_id', lessonId)
    .order('timestamp_seconds', { ascending: true })

  return NextResponse.json({
    bookmarks: (data ?? []).map((row) => mapBookmark(row as Record<string, unknown>)),
  })
}

interface BookmarkPostBody {
  timestampSeconds: number
  title?: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed || !access.user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: BookmarkPostBody
  try {
    body = (await request.json()) as BookmarkPostBody
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lesson_bookmarks')
    .insert({
      student_id: access.user.id,
      lesson_id: lessonId,
      course_id: courseId,
      timestamp_seconds: Math.max(0, body.timestampSeconds),
      title: body.title?.trim() || null,
    })
    .select('id, timestamp_seconds, title, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({
    bookmark: mapBookmark(data as Record<string, unknown>),
  })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await context.params
  const access = await resolveLessonPlaybackAccess(courseId, lessonId)
  if (!access?.allowed || !access.user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const bookmarkId = new URL(request.url).searchParams.get('id')
  if (!bookmarkId) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lesson_bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('student_id', access.user.id)
    .eq('lesson_id', lessonId)

  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
