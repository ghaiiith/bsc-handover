import { VIDEO_UPLOAD_PART_SIZE_MB } from '@/lib/constants'

export interface UploadVideoInput {
  courseId: string
  slot: 'lesson' | 'preview'
  lessonId?: string | null
  file: File
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export interface UploadVideoResult {
  assetId: string | null
  durationMinutes?: number
  error?: string
}

interface CreateUploadResponse {
  assetId: string
  key: string
  uploadId: string
  parts: { partNumber: number; url: string }[]
}

const PART_SIZE = VIDEO_UPLOAD_PART_SIZE_MB * 1024 * 1024

function videosApi(courseId: string, action: string): string {
  return `/api/instructor/courses/${courseId}/videos/${action}`
}

function getVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : null)
    }
    video.onerror = () => resolve(null)
    video.src = URL.createObjectURL(file)
  })
}

/** PUT a single part via XHR so we can track progress and read the ETag. */
function putPart(
  url: string,
  chunk: Blob,
  onChunkProgress: (loaded: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onChunkProgress(event.loaded)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag')
        if (!etag) {
          reject(new Error('missing_etag'))
          return
        }
        resolve(etag)
      } else {
        reject(new Error(`part_failed_${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('part_network_error'))
    xhr.onabort = () => reject(new Error('aborted'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(chunk)
  })
}

export async function uploadCourseVideoToR2({
  courseId,
  slot,
  lessonId,
  file,
  onProgress,
  signal,
}: UploadVideoInput): Promise<UploadVideoResult> {
  const partCount = Math.max(1, Math.ceil(file.size / PART_SIZE))
  const durationSeconds = await getVideoDurationSeconds(file)

  // 1) Reserve the object + get presigned part URLs.
  let created: CreateUploadResponse
  try {
    const res = await fetch(videosApi(courseId, 'create-upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot,
        lessonId: lessonId ?? undefined,
        filename: file.name,
        contentType: file.type || 'video/mp4',
        fileSize: file.size,
        partCount,
      }),
      signal,
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { assetId: null, error: data.error ?? 'upload_init_failed' }
    }
    created = (await res.json()) as CreateUploadResponse
  } catch {
    return { assetId: null, error: 'upload_init_failed' }
  }

  const abortUpload = async () => {
    await fetch(videosApi(courseId, 'abort-upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId: created.assetId, uploadId: created.uploadId }),
      keepalive: true,
    }).catch(() => undefined)
  }

  // 2) Upload each part directly to R2.
  const partProgress = new Array<number>(created.parts.length).fill(0)
  const completedParts: { partNumber: number; etag: string }[] = []

  const reportProgress = () => {
    if (!onProgress) return
    const loaded = partProgress.reduce((sum, value) => sum + value, 0)
    onProgress(Math.min(99, Math.round((loaded / file.size) * 100)))
  }

  try {
    for (const part of created.parts) {
      const start = (part.partNumber - 1) * PART_SIZE
      const end = Math.min(start + PART_SIZE, file.size)
      const chunk = file.slice(start, end)
      const index = part.partNumber - 1

      const etag = await putPart(
        part.url,
        chunk,
        (loaded) => {
          partProgress[index] = loaded
          reportProgress()
        },
        signal
      )
      partProgress[index] = chunk.size
      reportProgress()
      completedParts.push({ partNumber: part.partNumber, etag })
    }
  } catch (err) {
    await abortUpload()
    const message = err instanceof Error ? err.message : 'upload_failed'
    return { assetId: null, error: message === 'aborted' ? 'aborted' : 'upload_failed' }
  }

  // 3) Finalize.
  try {
    const res = await fetch(videosApi(courseId, 'complete-upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId: created.assetId,
        uploadId: created.uploadId,
        parts: completedParts,
        durationSeconds: durationSeconds ?? undefined,
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { assetId: null, error: data.error ?? 'upload_complete_failed' }
    }
  } catch {
    return { assetId: null, error: 'upload_complete_failed' }
  }

  onProgress?.(100)
  return {
    assetId: created.assetId,
    durationMinutes: durationSeconds ? Math.max(1, Math.ceil(durationSeconds / 60)) : undefined,
  }
}
