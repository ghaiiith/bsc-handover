import type { PlaybackAnalyticsPayload } from '@/types/video-player'

const FLUSH_INTERVAL_MS = 15_000
const pending: PlaybackAnalyticsPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush(endpoint: string) {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush(endpoint)
  }, FLUSH_INTERVAL_MS)
}

async function flush(endpoint: string) {
  if (pending.length === 0) return
  const batch = pending.splice(0, pending.length)
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
  } catch {
    /* analytics must never block playback */
  }
}

export function trackPlaybackEvent(
  endpoint: string | undefined,
  payload: PlaybackAnalyticsPayload
) {
  if (!endpoint) return
  pending.push({
    ...payload,
    metadata: {
      ...payload.metadata,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    },
  })
  scheduleFlush(endpoint)
}

export function flushPlaybackAnalytics(endpoint: string | undefined) {
  if (!endpoint) return
  void flush(endpoint)
}
