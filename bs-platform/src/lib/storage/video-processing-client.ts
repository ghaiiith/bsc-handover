// Client helpers to drive server-side (online) video transcoding after a raw
// upload: enqueue a job, then poll its progress until the HLS ladder is ready.

export interface VideoJobProgress {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled'
  progress: number
  stage: string | null
  error: string | null
  renditions?: { height: number; bitrateKbps: number }[]
}

export async function startVideoProcessing(
  courseId: string,
  lessonId: string,
  assetId: string
): Promise<{ jobId?: string; error?: string }> {
  try {
    const res = await fetch(
      `/api/instructor/courses/${courseId}/lessons/${lessonId}/process-video`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      }
    )
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error ?? 'enqueue_failed' }
    }
    const data = (await res.json()) as { jobId: string }
    return { jobId: data.jobId }
  } catch {
    return { error: 'enqueue_failed' }
  }
}

async function fetchJob(jobId: string): Promise<VideoJobProgress | null> {
  try {
    const res = await fetch(`/api/instructor/video-jobs/${jobId}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as VideoJobProgress
  } catch {
    return null
  }
}

/**
 * Poll a job until it reaches a terminal state. Calls `onProgress` on every
 * tick. Resolves with the final state (or a synthetic failure on timeout).
 */
export async function pollVideoJob(
  jobId: string,
  onProgress: (p: VideoJobProgress) => void,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<VideoJobProgress> {
  const intervalMs = opts.intervalMs ?? 2500
  const timeoutMs = opts.timeoutMs ?? 1000 * 60 * 60 // 1h ceiling
  const startedAt = Date.now()

  for (;;) {
    if (opts.signal?.aborted) {
      return { status: 'canceled', progress: 0, stage: null, error: 'aborted' }
    }
    const job = await fetchJob(jobId)
    if (job) {
      onProgress(job)
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
        return job
      }
    }
    if (Date.now() - startedAt > timeoutMs) {
      return { status: 'failed', progress: 0, stage: null, error: 'timeout' }
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}
