import { NextResponse } from 'next/server'
import { resolveLessonPlaybackAccess } from '@/lib/video/playback-access'
import { extractClientMeta, logVideoSecurityEvent } from '@/lib/video/security-log'
import type { PlaybackAnalyticsPayload } from '@/types/video-player'

export const runtime = 'nodejs'

function mapEventType(event: PlaybackAnalyticsPayload['event']): 'playback_started' | 'playback_finished' | 'playback_failed' {
  if (event === 'playback_completed') return 'playback_finished'
  if (event === 'playback_error') return 'playback_failed'
  return 'playback_started'
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

  let body: { events?: PlaybackAnalyticsPayload[] }
  try {
    body = (await request.json()) as { events?: PlaybackAnalyticsPayload[] }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const events = body.events ?? []
  const clientMeta = extractClientMeta(request)

  await Promise.all(
    events.map((event) =>
      logVideoSecurityEvent({
        eventType: mapEventType(event.event),
        courseId,
        lessonId,
        userId: access.user!.id,
        ...clientMeta,
        metadata: {
          ...event.metadata,
          event: event.event,
          currentTime: event.currentTime,
          duration: event.duration,
          quality: event.quality,
          playbackRate: event.playbackRate,
          errorCode: event.errorCode,
        },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
